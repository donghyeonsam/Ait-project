package com.aitserver.aiInterview.controller;

import com.aitserver.aiInterview.dto.AiInterviewPreparationResponse;
import com.aitserver.aiInterview.dto.AiInterviewQuestionRequest;
import com.aitserver.aiInterview.dto.AiInterviewQuestionResponse;
import com.aitserver.aiInterview.service.AiInterviewService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai-interviews")
@RequiredArgsConstructor
public class AiInterviewController {

    private final AiInterviewService aiInterviewService;

    @GetMapping
    public ResponseEntity<ApiResponse<AiInterviewPreparationResponse>> getInfo(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {
        // 사용자 정보 기반으로 이력서, 레포지토리 리스트 가져오자
        AiInterviewPreparationResponse response = aiInterviewService.getPreparationInfo(userId);

        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "사용자의 자기소개서, 깃허브 레포지토리 조회 완료",
                        response,
                        request
                ));
    }


    @PostMapping
    public ResponseEntity<ApiResponse<AiInterviewQuestionResponse>> insertAndGenerate(
            @AuthenticationPrincipal Long userId,
            @RequestBody @Valid AiInterviewQuestionRequest aiInterviewQuestionRequest,
            HttpServletRequest request
    ) {

        AiInterviewQuestionResponse response = aiInterviewService.insertAndGenerate(userId, aiInterviewQuestionRequest);

        return ResponseEntity.status(HttpStatus.OK).body(
                ApiResponse.success(
                        HttpStatus.OK,
                        "사용자 입력 정보 기반 질문 리스트 생성 완료",
                        response,
                        request
                )
        );
    }
}
