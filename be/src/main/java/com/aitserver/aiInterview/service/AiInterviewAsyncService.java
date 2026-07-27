package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.dto.FollowUpQuestionRequest;

public interface AiInterviewAsyncService {
    void insertAndAnalysisAsync(Long userId, Long aiInterviewId, FollowUpQuestionRequest questionRequest);

    void sendAudioToFastApiAsync(Long userId, Long aiInterviewId, byte[] audioBytes, String filename, String contentType);
}
