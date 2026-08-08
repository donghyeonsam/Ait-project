package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.client.FastApiClient;
import com.aitserver.aiInterview.dto.VoiceResult;
import com.aitserver.aiInterview.entity.AiComprehensiveReport;
import com.aitserver.aiInterview.repository.AiComprehensiveReportRepository;
import com.aitserver.aiInterview.repository.AiInterviewsRepository;
import com.aitserver.aiInterview.requestDto.FastApiFaceAnalyzeRequest;
import com.aitserver.aiInterview.requestDto.FollowUpQuestionRequest;
import com.aitserver.aiInterview.requestDto.NonVerbalDataRequest;
import com.aitserver.aiInterview.responseDto.FastScoreResponse;
import com.aitserver.aiInterview.responseDto.GmsAnalysisResponse;
import com.aitserver.aiInterview.entity.AiInterviewQuestion;
import com.aitserver.aiInterview.repository.AiInterviewQuestionRepository;
import com.aitserver.global.gms.client.GmsClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
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
    // 이 서비스 로직에서 5개의 점수가 다 저장된다.
    private final AiInterviewQuestionRepository aiInterviewQuestionRepository;
    private final GmsClient gmsClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RedisTemplate<String, String> redisTemplate;
    private final FastApiClient fastApiClient;
    private final AiInterviewsRepository aiInterviewsRepository;
    private final AiComprehensiveReportRepository aiComprehensiveReportRepository;

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
            
                    [공통 규칙]
                    - qna_score와 sentence_score는 0~10 사이의 정수입니다.
                    - 먼저 아래 기준에서 답변이 속하는 등급(2점 범위)을 정한 뒤, 그 범위 안에서 구체적인 점수를 정합니다.
                      (범위의 상단 설명에 가까우면 높은 값, 하단에 가까우면 낮은 값을 부여)
                    - 답변이 없거나 질문과 완전히 무관하면 해당 점수는 0점 처리합니다.
                    - 두 기준은 독립적으로 평가합니다. (예: 논리는 좋지만 문장이 엉망일 수 있음)
            
                    [평가 기준 1] 질의응답 (질문이해도 + 답변논리성)
                    질문의 의도를 정확히 파악하고 결론→근거 구조로 논리적으로 답했는지, 동문서답이나 불필요하게 장황한 설명은 없는지 평가합니다.
                    - 9~10점: 질문 의도를 정확히 파악하고, 결론→근거 구조가 명확하며 핵심을 간결하고 논리적으로 전달함. 군더더기 없음.
                    - 7~8점: 질문을 잘 이해하고 논리적으로 답변했으나, 근거가 일부 부족하거나 약간의 사족이 있음.
                    - 5~6점: 질문의 핵심은 파악했으나 논리 구조가 느슨하거나 설명이 다소 장황함.
                    - 3~4점: 질문 의도를 부분적으로만 이해했고, 논리 비약이 있거나 답변이 산만함.
                    - 1~2점: 질문을 거의 이해하지 못했거나 동문서답에 가까우며 논리성이 결여됨.
                    - 0점: 답변이 없거나 질문과 완전히 무관함.
            
                    [평가 기준 2] 문장구성 (문장 완성도 + 경어 사용)
                    문장을 제대로 끝맺었는지, 상황에 맞는 경어(존댓말)를 일관되게 썼는지, 비문이나 습관어("어...", "그...")의 남발이 없는지 평가합니다.
                    - 9~10점: 모든 문장이 완결되고, 상황에 맞는 경어를 일관되게 사용하며, 비문·습관어가 없음.
                    - 7~8점: 대체로 문장이 완결되고 경어가 적절하며, 습관어가 1~2회로 미미함.
                    - 5~6점: 문장 의미는 대체로 전달되나 일부 비문·말끝 흐림이 있고, 습관어가 간헐적으로 나타남.
                    - 3~4점: 비문이 잦고 문장 완결성이 떨어지며, 경어 사용이 불일치하거나 습관어가 잦음.
                    - 1~2점: 문장 대부분이 미완결이고, 경어가 부적절하거나 반말이 혼용되며 습관어를 남발함.
                    - 0점: 답변이 없어 평가할 수 없음.
            
                    [출력 형식]
                    {
                      "ai_answer": "사용자의 답변을 더 전문적이고 완벽하게 수정한 시니어 수준의 모범/보완 답변 (최대 270글자 이하)",
                      "feedback": "답변에서 부족한 점, 논리적 오류, 또는 추가로 언급했으면 좋았을 점 (피드백, 최대 270글자 이하)",
                      "qna_score": 질의응답 기준에 따른 0~10 사이의 정수,
                      "sentence_score": 문장구성 기준에 따른 0~10 사이의 정수
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

    @Override
    @Async
    public void sendAudioToFastApiAsync(Long userId, Long aiInterviewId, byte[] audioBytes, String filename, String contentType) {
        log.info("[===Async===] FastAPI 음성 분석 요청 시작...");

        try {
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
            log.info("[===Async=== 사용자의 시선 정보] 해상도: {} * {}", request.getScreenHeight() ,request.getScreenWidth());
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
                log.info("[===Async=== 사용자의 시선 정보] 시선 x좌표: {}, y좌표: {}", frame.getGazeX(), frame.getGazeY());
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

            FastApiFaceAnalyzeRequest finalPayload = FastApiFaceAnalyzeRequest.builder()
                    .fps(request.getFps())
                    .durationSec(request.getDurationSec())
                    .frames(fastApiFrames) // 방금 만든 비닐봉지 묶음을 큰 박스 안에 넣습니다.
                    .build();

            // 3. 최종 시선 점수 계산 (10점 만점 - (패널티 횟수 * 0.5점), 최하 0점 보장)
            double gazeScore = Math.max(10.0 - (totalPenaltyCount * PENALTY_SCORE), 0.0);
            String eyeRedisKey = "eye_score:" + userId + ":" + aiInterviewId;
            saveScoreInRedis(eyeRedisKey, String.valueOf(gazeScore)); // redis에 사용자 시선 점수 저장

            FastScoreResponse response = fastApiClient.sendFaceDataToFastApi( // FastAPI로 표정 좌표 넘겨서 점수 하나만 리턴 받기
                    "/analyses/face", // uri가 정해지면 넣자
                    finalPayload,
                    FastScoreResponse.class
            );

            String faceRedisKey = "face_score:" + userId + ":" + aiInterviewId;
            saveScoreInRedis(faceRedisKey, String.valueOf(response.getScore())); // redis에 사용자 표정 점수 저장

            log.info(">> Redis 비언어적 점수 누적 완료! (시선: {}점 [패널티 {}회], 표정: {}점)", gazeScore, totalPenaltyCount, response.getScore());
        } catch (Exception e) {
            log.error("[===Async=== AiInterviewAsyncServiceImpl] 비언어적 데이터 분석 중 에러 발생, userId: {}, aiInterviewId: {}",
                    userId, aiInterviewId, e);
        }
    }

    @Override
    @Transactional
    @Async
    @CacheEvict(value = "dashboard", key = "#userId")
    @Caching(
            evict = {
                    @CacheEvict(
                            value = "dashboard",
                            key = "#userId"
                    ),
                    @CacheEvict(
                            value = "reportList",
                            key = "#userId"
                    )
            }
    )
    public void interviewComplete(Long userId, Long aiInterviewId) {
        log.info("[===Async=== AiInterviewAsyncServiceImpl] AI 모의 면접 완료!!!");

        try {
            // 1. DB의 aiIntervewsRepository를 통해 면접 "doing"에서 "done"으로 변경
            aiInterviewsRepository.updateStatus(userId, aiInterviewId, "done");
            log.info(">> {}번 사용자의 면접 상태 변경 완료: doing -> done", userId);

            // 2. redis에서 기존 점수들을 각각 가져와서 평균 계산.
            Double avgQnaScore = calculateAverageFromRedis("qna_score:" + userId + ":" + aiInterviewId); // 질의응답 점수
            Double avgSentenceScore = calculateAverageFromRedis("sentence_score:" + userId + ":" + aiInterviewId); // 문장구성 점수
            Double avgVoiceScore = calculateAverageFromRedis("voice_score:" + userId + ":" + aiInterviewId); // 목소리 점수
            Double avgEyeScore = calculateAverageFromRedis("eye_score:" + userId + ":" + aiInterviewId); // 시선처리 점수
            Double avgFaceScore = calculateAverageFromRedis("face_score:" + userId + ":" + aiInterviewId); // 표정 점수

            log.info(">> [평균 점수 계산 완료] QnA: {}, 문장: {}, 음성: {}, 시선: {}, 표정: {}",
                    avgQnaScore, avgSentenceScore, avgVoiceScore, avgEyeScore, avgFaceScore);

            // 3. 전체 내용 분석해서 개선하면 좋을 점을 도출하기....
            // 해당 모의 면접에서의 질의응답 내용 조회
            List<AiInterviewQuestion> questions = aiInterviewQuestionRepository.findAllByAiInterviewId(aiInterviewId);

            StringBuilder qnaContext = new StringBuilder();
            for (int i = 0; i < questions.size(); i++) { // 전체 리스트에서 사용자의 질의응답과 AI 보완점 뽑기
                AiInterviewQuestion q = questions.get(i);
                qnaContext.append(String.format("""
                        [질문 %d] %s
                        - 작성한 답변: %s
                        - AI가 보완한 답변: %s
                        - AI 개별 피드백: %s
                        """, i + 1, q.getQuestion(), q.getUserAnswer(), q.getAiAnswer(), q.getFeedback()));
            }

            String developerPrompt = """
                    당신은 시니어 개발자이자 총괄 면접관입니다.
                    지원자의 전체 면접 결과(비언어적 요소 평가 점수 및 질문별 답변/피드백)를 바탕으로 종합 평가 리포트를 작성해 주세요.
                    
                    [작성 가이드라인]
                    1. 가식적인 칭찬보다는 실제 면접에 도움이 되는 구체적이고 담백한 피드백을 제공하세요.
                    2. 강점(strengths)과 보완점(weaknesses)을 각각 1~4개의 핵심 문장으로 정리하세요.
                    3. 응답은 반드시 아래 형식의 순수 JSON 포맷으로만 작성해야 하며, 백틱(```)이나 마크다운 텍스트는 절대 포함하지 마세요.
                    
                    {
                      "strengths": [
                        "자료구조에 대한 이해도가 높으며, 특히 해시 테이블의 충돌 해결 방식을 명확하게 설명했습니다.",
                        "결론을 먼저 말하고 근거를 제시하는 두괄식 말하기 습관이 아주 좋습니다."
                      ],
                      "weaknesses": [
                        "답변 중간에 '어...', '그...' 와 같은 습관어가 반복되어 다소 자신감이 부족해 보일 수 있습니다.",
                        "프로젝트 경험을 설명할 때 본인의 구체적인 기여도보다 팀 전체의 성과 위주로 말하는 경향이 있습니다."
                      ]
                    }
                    """;

            String userPrompt = String.format("""
                    [지원자 평균 점수 요약 (10점 만점)]
                    - 질의응답 이해도 점수: %.2f점
                    - 문장 구성력 점수: %.2f점
                    - 음성 전달력 점수: %.2f점
                    - 시선 처리 점수: %.2f점
                    - 표정 자연스러움 점수: %.2f점
                    
                    [질문별 답변 및 피드백 히스토리]
                    %s
                    """, avgQnaScore, avgSentenceScore, avgVoiceScore, avgEyeScore, avgFaceScore, qnaContext.toString());


            log.info(">> GMS 종합 평가 리포트 생성 요청 시작...");
            String reportContent = gmsClient.generate(developerPrompt, userPrompt);
            // json 파싱 에러 방지
            reportContent = reportContent.replace("```json", "").replace("```", "").trim();
            log.info(">> GMS 종합 평가 리포트 생성 완료!");

            // 4. DB의 aiComprehensiveReport 엔티티 참고해서 각각의 평균점수랑 최종 분석 결과 json 넣기
            AiComprehensiveReport reportEntity = AiComprehensiveReport.builder()
                    .aiInterviewId(aiInterviewId)
                    .content(reportContent)
                    .qnaScore(avgQnaScore)
                    .sentenceScore(avgSentenceScore)
                    .voiceScore(avgVoiceScore)
                    .eyeContactScore(avgEyeScore)
                    .faceScore(avgFaceScore)
                    .build();

            aiComprehensiveReportRepository.save(reportEntity);
            log.info(">> [성공] ai_comprehensive_reports 테이블에 최종 리포트 저장 완료! Report ID: {}", reportEntity.getId());

            deleteRedisKeys(userId, aiInterviewId);

        } catch (Exception e) {
            log.error("[===Async=== AiInterviewAsyncServiceImpl] 모의 면접 AI 레포트 발행 중 에러 발생, userId: {}, aiInterviewId: {}",
                    userId, aiInterviewId, e);
        }
    }

    // Redis에 저장된 점수를 통해 평균을 계산하는 메서드
    private Double calculateAverageFromRedis(String redisKey) {
        List<String> scores = redisTemplate.opsForList().range(redisKey, 0, -1);
        if (scores == null || scores.isEmpty()) {
            return 0.0; // 점수가 없으면 0.0 리턴
        }

        double sum = 0.0; // 저장된 점수의 합
        int count = 0; // 저장된 점수의 개수
        for (String scoreStr : scores) {
            try {
                sum += Double.parseDouble(scoreStr);
                count++;
            } catch (NumberFormatException e) {
                log.warn("Redis 점수 파싱 실패 - key: {}, val: {}", redisKey, scoreStr);
            }
        }
        if (count == 0) return 0.0; // 저장된 점수의 개수가 0개였다면 0.0 리턴

        double avg = sum / count; // 평균 계산 후 소수점 둘째 자리까지 반올림
        return Math.round(avg * 100.0) / 100.0;
    }

    // Redis에 점수 저장하는 메서드
    private void saveScoreInRedis(String redisKey, String redisValue) {
        redisTemplate.opsForList().rightPush(redisKey, redisValue);
        redisTemplate.expire(redisKey, 1, TimeUnit.DAYS);
    }

    // Redis에 점수 삭제하는 메서드
    private void deleteRedisKeys(Long userId, Long aiInterviewId) {
        String prefix = ":" + userId + ":" + aiInterviewId;
        redisTemplate.delete(List.of(
                "qna_score" + prefix,
                "sentence_score" + prefix,
                "voice_score" + prefix,
                "eye_score" + prefix,
                "face_score" + prefix
        ));
        log.info(">> Redis 임시 점수 데이터 삭제 완료");
    }
}
