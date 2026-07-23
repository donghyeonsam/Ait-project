package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.dto.AiInterviewPreparationResponse;
import com.aitserver.aiInterview.dto.AiInterviewQuestionRequest;
import com.aitserver.aiInterview.dto.AiInterviewQuestionResponse;
import jakarta.validation.Valid;

public interface AiInterviewService {
    AiInterviewPreparationResponse getPreparationInfo(Long userId);

    AiInterviewQuestionResponse insertAndGenerate(Long userId, @Valid AiInterviewQuestionRequest aiInterviewQuestionRequest);
}
