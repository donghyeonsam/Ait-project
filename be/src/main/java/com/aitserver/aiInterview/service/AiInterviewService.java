package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.dto.*;
import jakarta.validation.Valid;
import org.springframework.web.multipart.MultipartFile;

public interface AiInterviewService {
    AiInterviewPreparationResponse getPreparationInfo(Long userId);

    AiInterviewQuestionResponse insertAndGenerate(Long userId, @Valid AiInterviewQuestionRequest aiInterviewQuestionRequest);

    FollowUpQuestionResponse answerCheckForFollowUp(Long userId, Long aiInterviewId, FollowUpQuestionRequest questionRequest, MultipartFile audioFile);

    <T, R> R sendToFastApi(String uri, T requestBody, Class<R> responseType);
}
