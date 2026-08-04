package com.aitserver.peerFeedback.controller;



import com.aitserver.global.response.ApiResponse;
import com.aitserver.peerFeedback.dto.AiPeerSummaryResponse;
import com.aitserver.peerFeedback.service.AiPeerSummaryService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/study-sessions")
@RequiredArgsConstructor
public class AiPeerSummaryController {

    private final AiPeerSummaryService
            aiPeerSummaryService;
//
//    @PostMapping("/{sessionId}/peer-summaries")
//    public ResponseEntity<ApiResponse<List<AiPeerSummaryResponse>>>
//    generate(
//            @PathVariable Long sessionId,
//            HttpServletRequest request
//    ) {
//
//        List<AiPeerSummaryResponse> response =
//                aiPeerSummaryService.generate(
//                        sessionId
//                );
//
//        return ResponseEntity
//                .status(HttpStatus.OK)
//                .body(ApiResponse.success(
//                        HttpStatus.OK,
//                        "상호평가 ai 요약에 성공했습니다.",
//                        response,
//                        request
//                ));
//    }
}