package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.client.FastApiClient;
import com.aitserver.aiInterview.dto.VoiceResult;
import com.aitserver.aiInterview.requestDto.FastApiFaceAnalyzeRequest;
import com.aitserver.aiInterview.requestDto.FastVoiceAnalysisRequest;
import com.aitserver.aiInterview.requestDto.FollowUpQuestionRequest;
import com.aitserver.aiInterview.requestDto.NonVerbalDataRequest;
import com.aitserver.aiInterview.responseDto.FastScoreResponse;
import com.aitserver.aiInterview.responseDto.GmsAnalysisResponse;
import com.aitserver.aiInterview.entity.AiInterviewQuestion;
import com.aitserver.aiInterview.repository.AiInterviewQuestionRepository;
import com.aitserver.aiInterview.responseDto.VoiceAcceptedResponse;
import com.aitserver.aiInterview.responseDto.VoiceResultResponse;
import com.aitserver.global.gms.client.GmsClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiInterviewAsyncServiceImpl implements AiInterviewAsyncService {

    private final AiInterviewQuestionRepository aiInterviewQuestionRepository;
    private final GmsClient gmsClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RedisTemplate<String, String> redisTemplate;
    private final FastApiClient fastApiClient;

    @Override
    @Async
    @Transactional
    public void insertAndAnalysisAsync(Long userId, Long aiInterviewId, FollowUpQuestionRequest questionRequest) {
        log.info("[===Async=== AiInterviewAsyncServiceImpl] DB 저장 및 AI 분석 로직 시작, userId: {}, aiInterviewId, {}", userId, aiInterviewId);

        // gms 호출해서 질문에 대한 내용이랑 사용자의 답변을 분석하라고 보내야 한다.
        try {
            // 1. gms로 질문 내용과 답변 전송
            String developerPrompt = """
                    당신은 시니어 개발자이자 전문적인 기술 면접관입니다.
                    제공된 '면접 질문'과 '사용자의 답변'을 분석하여 평가해 주세요.
                    응답은 반드시 아래 형식의 순수 JSON 포맷으로만 작성해야 하며, 백틱(```)이나 마크다운, 기타 부가 설명은 절대 포함하지 마세요.
                    
                    [평가 기준]
                    1. 질의응답 (질문이해도 + 답변논리성)
                    - 질문의 의도를 정확히 파악하고 논리적으로(결론→근거 구조) 답했는지, 동문서답이나 장황한 설명은 없는지 평가합니다.
                    2. 문장구성 (문장 완성도 + 경어 사용)
                    - 문장을 제대로 끝맺었는지, 상황에 맞는 경어(존댓말)를 썼는지, 비문이나 습관어("어...", "그...")의 남발이 없는지 평가합니다.
                    
                    {
                      "ai_answer": "사용자의 답변을 더 전문적이고 완벽하게 수정한 시니어 수준의 모범/보완 답변",
                      "feedback": "답변에서 부족한 점, 논리적 오류, 또는 추가로 언급했으면 좋았을 점 (피드백)",
                      "qna_score": 질의응답 기준에 따른 평가 점수 (0~10 사이의 정수),
                      "sentence_score": 문장구성 기준에 따른 평가 점수 (0~10 사이의 정수)
                    }
                    """;

            String userPrompt = String.format("면접 질문: %s\n사용자 답변: %s",
                    questionRequest.getQuestion().getQuestion(), // 루브릭 제외하고 실제 질문과 답변만 전달
                    questionRequest.getAnswer());

            log.info(">> GMS 분석 요청 시작...");

            // 2. gms에서 분석 후 AI 보완 답변과 보완할 부분, 총 점수 10점 만점으로 반환
            String gmsRawResponse = gmsClient.generate(developerPrompt, userPrompt);
            gmsRawResponse = gmsRawResponse.replace("```json", "").replace("```", "").trim();

            GmsAnalysisResponse aiResponse = objectMapper.readValue(gmsRawResponse, GmsAnalysisResponse.class);

            log.info(">> GMS 분석 완료! 질의응답: {}점, 문장구성: {}점", aiResponse.qnaScore(), aiResponse.sentenceScore());
            log.info(">> GMS 기반 AI 보완 답변: {}, 피드백 내용: {}", aiResponse.aiAnswer(), aiResponse.feedback());

            // 3. 질문과 사용자의 답변 DB에 저장
            AiInterviewQuestion questionEntity = AiInterviewQuestion.builder()
                    .aiInterviewId(aiInterviewId)
                    .question(questionRequest.getQuestion().getQuestion())
                    .userAnswer(questionRequest.getAnswer())
                    .aiAnswer(aiResponse.aiAnswer())
                    .feedback(aiResponse.feedback())
                    .build();
            aiInterviewQuestionRepository.save(questionEntity); // DB에 일단 저장

            // 4. 답변쪽은 모두 DB에 저장하고, 점수는 redis에 userId + aiInterviewId를 키로 저장하고, value에는 리스트 형식으로 점수 하나씩 추가하기
            String qnaRedisKey = "qna_score:" + userId + ":" + aiInterviewId;
            saveScoreInRedis(qnaRedisKey, String.valueOf(aiResponse.qnaScore()));

            // 5. 문장구성 점수 redis에 저장
            String sentenceRedisKey = "sentence_score:" + userId + ":" + aiInterviewId;
            saveScoreInRedis(sentenceRedisKey, String.valueOf(aiResponse.sentenceScore()));

            log.info(">> Redis 2가지 점수(QnA, Sentence) 누적 완료!");

        } catch (Exception e) {
            log.error("[===Async=== AiInterviewAsyncServiceImpl] DB 저장 및 AI 분석 중 에러 발생, userId: {}, aiInterviewId,{}",
                    userId, aiInterviewId, e);
        }
    }

//    @Override
//    @Async
//    public void sendAudioToFastApiAsync(Long userId, Long aiInterviewId, byte[] audioBytes, String filename, String contentType) {
//        log.info("[===Async=== AiInterviewAsyncServiceImpl] FastAPI로 음성 분석을 위한 바이트 전달, userId: {}, aiInterviewId, {}", userId, aiInterviewId);
//
//        try {
//            // 1. FastAPI로 음성 바이트 전송하기 위해 객체에 담기
//            FastVoiceAnalysisRequest request = new FastVoiceAnalysisRequest();
//            request.setAudioData(audioBytes);
//            // 2. 점수 리턴
//            FastScoreResponse response = fastApiClient.sendAudioToFastApi(
//                    "/analyses/voice", // 여기에는 uri가 정해지면 넣자
//                    audioBytes,
//                    filename,
//                    FastScoreResponse.class
//            );
//
//            // 3. 레디스에 userId + aiInterviewId + 점수를 키로 하고, value에는 리스트 형식으로 점수를 하나씩 추가하기
//            String voiceRedisKey = "voice_score:" + userId + ":" + aiInterviewId;
//            saveScoreInRedis(voiceRedisKey, String.valueOf(response.getScore()));
//
//        } catch (Exception e) {
//            log.error("[===Async=== AiInterviewAsyncServiceImpl] FastAPI 음성 분석 로직 중 에러 발생, userId: {}, aiInterviewId,{}",
//                    userId, aiInterviewId, e);
//        }
//    }
    @Override
    @Async
    public void sendAudioToFastApiAsync(Long userId, Long aiInterviewId, byte[] audioBytes, String filename, String contentType) {
        log.info("[===Async===] FastAPI 음성 분석 요청 시작...");

        try {
            // 💡 폴링 없이 바로 기다립니다. (FastAPI가 분석 후 VoiceResult를 바로 리턴해 줍니다)
            VoiceResult finalResult = fastApiClient.sendAudioToFastApi(
                    "/analyses/voice",
                    audioBytes,
                    filename,
                    userId + "-" + aiInterviewId, // request_id 용도
                    VoiceResult.class
            );

            // 레디스에 점수 저장
            Integer score = finalResult.score();
            String voiceRedisKey = "voice_score:" + userId + ":" + aiInterviewId;
            redisTemplate.opsForList().rightPush(voiceRedisKey, String.valueOf(score));
            redisTemplate.expire(voiceRedisKey, 1, TimeUnit.DAYS);

            log.info(">> Redis 음성 분석 점수({}점) 누적 완료!", score);

        } catch (Exception e) {
            log.error("[===Async===] FastAPI 음성 분석 중 에러 발생", e);
        }
    }

    // 비동기로 사용자의 비언어적 데이터 분석 수행
    @Override
    @Async
    public void nonVerbalDataAnalysisAsync(Long userId, Long aiInterviewId, NonVerbalDataRequest request) {
        log.info("[===Async=== AiInterviewAsyncServiceImpl] 시선/표정 비언어적 데이터 분석 시작, userId: {}, aiInterviewId: {}",
                userId, aiInterviewId);

        try {
            // 1. 시선 이탈률 계산, AI 사용하지 않고, 수학 공식으로 판별
            double centerX = request.getScreenWidth() / 2.0;
            double centerY = request.getScreenHeight() / 2.0;
            double maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));

            final double OUT_THRESHOLD = 0.4;  // 화면 중심에서 40% 이상 벗어나면 '이탈'로 간주 (테스트 후 조절)
            final int MAX_CONSECUTIVE = 3;     // 3프레임(0.6초) 연속 이탈 시 패널티
            final double PENALTY_SCORE = 0.5;  // 1회 적발 시 감점할 점수 (10점 만점 기준)

            int consecutiveOutCount = 0;       // 현재 연속 이탈 횟수
            int totalPenaltyCount = 0;         // 총 부여된 패널티 횟수

            List<FastApiFaceAnalyzeRequest.FastApiFrameData> fastApiFrames = new ArrayList<>();

            for (NonVerbalDataRequest.FrameData frame : request.getFrames()) { // 반복문으로 계산하면서 FastAPI에 필요한 것만 담기
                double currentDistance = Math.sqrt(Math.pow(frame.getGazeX() - centerX, 2) + Math.pow(frame.getGazeY() - centerY, 2));
                double deviation = Math.min(currentDistance / maxDistance, 1.0);

                // 1. 노이즈 필터링 로직: 시선이 임계치 이상 벗어났는가?
                if (deviation >= OUT_THRESHOLD) {
                    consecutiveOutCount++; // 이탈 카운트 증가

                    // 2. 연속 3번(0.6초) 이탈했다면 패널티 부여!
                    if (consecutiveOutCount == MAX_CONSECUTIVE) {
                        totalPenaltyCount++; // 시선 3회 연속 이탈했으니 패널티 부여
                        consecutiveOutCount = 0; // 패널티 부여 후 카운트 초기화
                        log.info(">> [시선 이탈 감지] 패널티 누적 (현재 패널티 횟수: {})", totalPenaltyCount);
                    }
                } else {
                    // 순간적으로 튀었더라도 다시 중앙을 응시하면 카운트를 초기화 (억울한 감점 방지)
                    consecutiveOutCount = 0;
                }

                fastApiFrames.add(FastApiFaceAnalyzeRequest.FastApiFrameData.builder()
                        .blendshapes(frame.getBlendshapes())
                        .ear(frame.getEar())
                        .mar(frame.getMar())
                        .deviation(deviation)
                        .build());
            }

            // 3. 최종 시선 점수 계산 (10점 만점 - (패널티 횟수 * 0.5점), 최하 0점 보장)
            double gazeScore = Math.max(10.0 - (totalPenaltyCount * PENALTY_SCORE), 0.0);
            String eyeRedisKey = "eye_score:" + userId + ":" + aiInterviewId;
            saveScoreInRedis(eyeRedisKey, String.valueOf(gazeScore)); // redis에 사용자 시선 점수 저장

            FastScoreResponse response = fastApiClient.sendToFastApi( // FastAPI로 표정 좌표 넘겨서 점수 하나만 리턴 받기
                    "", // uri가 정해지면 넣자
                    fastApiFrames,
                    FastScoreResponse.class
            );

            String faceRedisKey = "face_score:" + userId + ":" + aiInterviewId;
            saveScoreInRedis(faceRedisKey, String.valueOf(response.getScore())); // redis에 사용자 표정 점수 저장

            log.info(">> Redis 비언어적 점수 누적 완료! (시선: {}점 [패널티 {}회])", gazeScore, totalPenaltyCount);
        } catch (Exception e) {
            log.error("[===Async=== AiInterviewAsyncServiceImpl] 비언어적 데이터 분석 중 에러 발생, userId: {}, aiInterviewId: {}",
                    userId, aiInterviewId, e);
        }
    }

    private void saveScoreInRedis(String redisKey, String redisValue) {
        redisTemplate.opsForList().rightPush(redisKey, redisValue);
        redisTemplate.expire(redisKey, 1, TimeUnit.DAYS);
    }
}
