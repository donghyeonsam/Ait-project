package com.aitserver.peerFeedback.controller;


import com.aitserver.global.response.ApiResponse;
import com.aitserver.peerFeedback.service.PeerFeedbackSubmissionStatusService;
import com.aitserver.peerFeedback.dto.PeerFeedbackSubmissionStatusResponse;
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
@RequestMapping("/api/study-sessions")
public class PeerFeedbackSubmissionStatusController {

    private final PeerFeedbackSubmissionStatusService submissionStatusService;

    @GetMapping(
            "/{sessionId}/peer-feedback/submission-status"
    )
    public ResponseEntity<ApiResponse<PeerFeedbackSubmissionStatusResponse>>
    getPeerFeedbackSubmissionStatus(
            @PathVariable Long sessionId,
            HttpServletRequest request
    ) {
        PeerFeedbackSubmissionStatusResponse response =
                submissionStatusService.getSubmissionStatus(
                        sessionId
                );

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "미제출 참여자 존재 여부 조회에 성공하였습니다.",
                        response,
                        request
                ));
    }
}