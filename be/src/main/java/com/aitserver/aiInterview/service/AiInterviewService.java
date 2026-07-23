package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.dto.*;
import jakarta.validation.Valid;

public interface AiInterviewService {
    AiInterviewPreparationResponse getPreparationInfo(Long userId);

    AiInterviewQuestionResponse insertAndGenerate(Long userId, @Valid AiInterviewQuestionRequest aiInterviewQuestionRequest);

    FollowUpQuestionResponse answerCheckForfollowUp(Long userId, Long aiInterviewId, FollowUpQuestionRequest answerRequest);
}
