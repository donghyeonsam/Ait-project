package com.aitserver.resume.controller;

import com.aitserver.global.response.ApiResponse;
import com.aitserver.resume.dto.ResumeResponse;
import com.aitserver.resume.dto.ResumeUpdateRequest;
import com.aitserver.resume.service.ResumeService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/resumes")
public class ResumeController {

    private final ResumeService resumeService;

    // 이력서 아이디 기반 조회
    @GetMapping("/{resumeId}")
    public ResponseEntity<ApiResponse<ResumeResponse>> getResume(
            @PathVariable Long resumeId,
            HttpServletRequest request

    ){

        ResumeResponse resumeResponse = resumeService.getResume(resumeId);
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "이력서 아이디 기반 조회 성공",
                        resumeResponse,
                        request
                ));
    }

    // 내 이력서 조회
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<ResumeResponse>> getResume(
            HttpServletRequest request
            // jwt
    ){
        Long userId = 1L;   // 차후에는 토큰에서 추출
        ResumeResponse resumeResponse = resumeService.getMyResume(userId);
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "내 이력서 조회 성공",
                        resumeResponse,
                        request
                ));
    }

    @PutMapping("/{resumeId}")
    public ResponseEntity<ApiResponse<ResumeResponse>> updateResume(
            @PathVariable Long resumeId,
            // jwt
            @Valid @RequestBody ResumeUpdateRequest updateRequest,
            HttpServletRequest request
    ) {
        ResumeResponse response = resumeService.updateResume(
                resumeId,
                //userDetails.getUserId(),
                1L,// 임시
                updateRequest
        );

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "이력서 저장 및 수정을 성공했습니다.",
                        response,
                        request
                ));
    }


}
