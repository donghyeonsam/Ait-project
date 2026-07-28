package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.dto.FollowUpQuestionRequest;
import com.aitserver.aiInterview.dto.GmsAnalysisResponse;
import com.aitserver.aiInterview.entity.AiInterviewQuestion;
import com.aitserver.aiInterview.repository.AiInterviewQuestionRepository;
import com.aitserver.global.gms.client.GmsClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiInterviewAsyncServiceImpl implements AiInterviewAsyncService {

    private final AiInterviewQuestionRepository aiInterviewQuestionRepository;
    private final GmsClient gmsClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RedisTemplate<String, String> redisTemplate;

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
                    {
                      "ai_answer": "사용자의 답변을 더 전문적이고 완벽하게 수정한 시니어 수준의 모범/보완 답변",
                      "feedback": "답변에서 부족한 점, 논리적 오류, 또는 추가로 언급했으면 좋았을 점 (피드백)",
                      "score": 10점 만점 기준의 평가 점수 (0~10 사이의 정수)
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
            log.info(">> GMS 분석 완료! 점수: {}점", aiResponse.score());

            // 0. 질문과 사용자의 답변 DB에 저장
            AiInterviewQuestion questionEntity = AiInterviewQuestion.builder()
                    .aiInterviewId(aiInterviewId)
                    .question(questionRequest.getQuestion().getQuestion())
                    .userAnswer(questionRequest.getAnswer())
                    .aiAnswer(aiResponse.aiAnswer())
                    .feedback(aiResponse.feedback())
                    .build();
            aiInterviewQuestionRepository.save(questionEntity); // DB에 일단 저장

            // 3. 답변쪽은 모두 DB에 저장하고, 점수는 redis에 userId + aiInterviewId를 키로 저장하고, value에는 리스트 형식으로 점수 하나씩 추가하기
            String redisKey = "interview_score:" + userId + ":" + aiInterviewId;
            redisTemplate.opsForList().rightPush(redisKey, String.valueOf(aiResponse.score()));
            redisTemplate.expire(redisKey, 1, TimeUnit.DAYS); // 유효기간 1일
            log.info(">> Redis 점수 누적 완료!");

        } catch (Exception e) {
            log.error("[===Async=== AiInterviewAsyncServiceImpl] DB 저장 및 AI 분석 중 에러 발생, userId: {}, aiInterviewId,{}",
                    userId, aiInterviewId, e);
        }
    }

    @Override
    @Async
    public void sendAudioToFastApiAsync(Long userId, Long aiInterviewId, byte[] audioBytes, String filename, String contentType) {
        log.info("[===Async=== AiInterviewAsyncServiceImpl] FastAPI로 음성 분석을 위한 바이트 전달, userId: {}, aiInterviewId, {}", userId, aiInterviewId);

        // FastAPI로 음성 바이트를 보내서 분석을 시킨다. Librosa는 파일보다 바이트 스트림을 더 선호
        try {
            // 1. FastAPI로 음성 바이트 전송
            // 2. 점수 리턴
            // 3. 레디스에 userId + aiInterviewId + 점수를 키로 하고, value에는 리스트 형식으로 점수를 하나씩 추가하기

        } catch (Exception e) {
            log.error("[===Async=== AiInterviewAsyncServiceImpl] FastAPI 음성 분석 로직 중 에러 발생, userId: {}, aiInterviewId,{}",
                    userId, aiInterviewId, e);
        }
    }
}
