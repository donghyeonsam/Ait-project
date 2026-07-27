package com.aitserver.studySession.controller;

import com.aitserver.global.response.ApiResponse;
import com.aitserver.studySession.dto.StudySessionConnectionResponse;
import com.aitserver.studySession.service.StudySessionConnectionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/study-sessions")
public class StudySessionConnectionController {


    private final StudySessionConnectionService studySessionConnectionService;
    // 입장 토큰 발급
    @PostMapping("/{sessionId}/connection")
    public ResponseEntity<ApiResponse<StudySessionConnectionResponse>>
    createConnection(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        StudySessionConnectionResponse response =
                studySessionConnectionService
                        .createConnection(
                                sessionId,
                                userId
                        );

        return ResponseEntity
                .ok(ApiResponse.success(
                        HttpStatus.OK,
                        "토큰 발급 성공했습니다.",
                        response,
                        request
                ));
    }
}