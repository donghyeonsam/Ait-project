package com.aitserver.aiInterview.controller;

import com.aitserver.aiInterview.dto.*;
import com.aitserver.aiInterview.service.AiInterviewService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
            HttpServletRequest request) {
        // 사용자가 입력한 정보를 토대로 질문 생성
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

    @PostMapping(
            value = "/{aiInterviewId}/answers",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FollowUpQuestionResponse>> answerCheck(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long aiInterviewId,
            @RequestPart(value = "questionRequest") FollowUpQuestionRequest questionRequest,      // 사용자가 답변한 질문 정보
            @RequestPart(value = "audioFile") MultipartFile audioFile, // 사용자의 답변 음성 파일
            HttpServletRequest request) {
        // 질문과 사용자의 답변을 전달해서, 꼬리 질문을 생성
        FollowUpQuestionResponse response = aiInterviewService.answerCheckForfollowUp(userId, aiInterviewId, questionRequest, audioFile);

        return ResponseEntity.status(HttpStatus.OK).body(
                ApiResponse.success(
                        HttpStatus.OK,
                        "사용자 답변 분석 완료",
                        response,
                        request
                )
        );
    }
}
