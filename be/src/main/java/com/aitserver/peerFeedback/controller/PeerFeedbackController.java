package com.aitserver.peerFeedback.controller;


import com.aitserver.global.response.ApiResponse;
import com.aitserver.peerFeedback.dto.PeerFeedbackCreateRequest;
import com.aitserver.peerFeedback.dto.PeerFeedbackDetailResponse;
import com.aitserver.peerFeedback.service.PeerFeedbackService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/peer-feedback")
public class PeerFeedbackController {

    private final PeerFeedbackService peerFeedbackService;


    // 상호 평가 id기반 조회
    @GetMapping("/{peerFeedbackId}")
    public ResponseEntity<ApiResponse<PeerFeedbackDetailResponse>> getPeerFeedback(
            @PathVariable Long peerFeedbackId,
            HttpServletRequest request
    ) {
        PeerFeedbackDetailResponse response = peerFeedbackService.getPeerFeedbackDetail(peerFeedbackId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "id 기반 상호 평가 조회 성공했습니다.",
                        response,
                        request
                ));
    }


    // 내가 해당 세션에서 작성한 상호평가 목록 불러오기
    @GetMapping("/{sessionId}/me")
    public ResponseEntity<ApiResponse<List<PeerFeedbackDetailResponse>>> getPeerFeedbackIWright(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ){
        List<PeerFeedbackDetailResponse> response = peerFeedbackService.getPeerFeedbackWrightList(sessionId, userId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "내가 작성한 상호 평가 리스트 조회 성공했습니다.",
                        response,
                        request
                ));
    }


    // 내가 받은 상호평가 불러오기
    @GetMapping("/me/received")
    public ResponseEntity<ApiResponse<List<PeerFeedbackDetailResponse>>> getPeerFeedbackIReceived(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ){
        List<PeerFeedbackDetailResponse> response = peerFeedbackService.getPeerFeedbackReceiveList(userId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "내가 받은 상호 평가 리스트 조회 성공했습니다.",
                        response,
                        request
                ));
    }


    // 상호 평가 점수 등록
    @PostMapping("/{sessionId}/peer-feedbacks")
    public ResponseEntity<ApiResponse<PeerFeedbackDetailResponse>> postPeerFeedback(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal Long userId,
            PeerFeedbackCreateRequest peerFeedbackCreateRequest,
            HttpServletRequest request
    ){
        PeerFeedbackDetailResponse response = peerFeedbackService.createPeerFeedback(peerFeedbackCreateRequest, userId, sessionId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "상호 평가 점수 등록 성공했습니다.",
                        response,
                        request
                ));
    }



    // 상호 평가 점수 수정





}
