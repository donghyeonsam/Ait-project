package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.dto.AiInterviewPreparationResponse;

public interface AiInterviewService {
    AiInterviewPreparationResponse getPreparationInfo(Long userId);
}
