package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.dto.FollowUpQuestionRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiInterviewAsyncServiceImpl implements AiInterviewAsyncService {

    private final AiInterviewService aiInterviewService;

    @Override
    @Async
    @Transactional
    public void insertAndAnalysisAsync(Long userId, Long aiInterviewId, FollowUpQuestionRequest questionRequest) {
        log.info("[===Async=== AiInterviewAsyncServiceImpl] DB 저장 및 AI 분석 로직 시작, userId: {}, aiInterviewId, {}", userId, aiInterviewId);

        // gms 호출해서 질문에 대한 내용이랑 사용자의 답변을 분석하라고 보내야 한다.
    }

    @Override
    @Async
    public void sendAudioToFastApiAsync(Long userId, Long aiInterviewId, byte[] audioBytes, String filename, String contentType) {
        log.info("[===Async=== AiInterviewAsyncServiceImpl] FastAPI로 음성 분석을 위한 바이트 전달, userId: {}, aiInterviewId, {}", userId, aiInterviewId);

        // FastAPI로 음성 바이트를 보내서 분석을 시킨다. Librosa는 파일보다 바이트 스트림을 더 선호
    }
}
