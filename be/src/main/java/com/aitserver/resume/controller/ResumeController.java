package com.aitserver.resume.controller;

import com.aitserver.global.response.ApiResponse;
import com.aitserver.resume.dto.ResumeResponse;
import com.aitserver.resume.service.ResumeService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
            // jwt
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
                        "이력서 아이디 기반 조회 성공",
                        resumeResponse,
                        request
                ));
    }



}
