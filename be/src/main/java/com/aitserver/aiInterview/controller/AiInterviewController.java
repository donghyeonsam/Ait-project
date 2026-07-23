package com.aitserver.aiInterview.controller;

import com.aitserver.aiInterview.dto.AiInterviewPreparationResponse;
import com.aitserver.aiInterview.service.AiInterviewService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
