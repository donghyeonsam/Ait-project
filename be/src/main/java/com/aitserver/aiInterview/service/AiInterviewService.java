package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.requestDto.AiInterviewQuestionRequest;
import com.aitserver.aiInterview.requestDto.FollowUpQuestionRequest;
import com.aitserver.aiInterview.responseDto.*;
import jakarta.validation.Valid;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface AiInterviewService {
    AiInterviewPreparationResponse getPreparationInfo(Long userId);

    AiInterviewQuestionResponse insertAndGenerate(Long userId, @Valid AiInterviewQuestionRequest aiInterviewQuestionRequest);

    FollowUpQuestionResponse answerCheckForFollowUp(Long userId, Long aiInterviewId, FollowUpQuestionRequest questionRequest, MultipartFile audioFile);

    List<ReportListResponse> getList(Long userId);

    AiInterviewDetailResponse getInterviewDetail(Long userId, Long aiInterviewId);
}
