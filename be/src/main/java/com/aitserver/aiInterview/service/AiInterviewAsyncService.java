package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.requestDto.FollowUpQuestionRequest;
import com.aitserver.aiInterview.requestDto.NonVerbalDataRequest;

public interface AiInterviewAsyncService {
    void insertAndAnalysisAsync(Long userId, Long aiInterviewId, FollowUpQuestionRequest questionRequest);

    void sendAudioToFastApiAsync(Long userId, Long aiInterviewId, byte[] audioBytes, String filename, String contentType);

    void nonVerbalDataAnalysisAsync(Long userId, Long aiInterviewId, NonVerbalDataRequest nonVerbalDataRequest);
}
