package com.aitserver.aiInterview.controller;

import com.aitserver.aiInterview.requestDto.AiInterviewQuestionRequest;
import com.aitserver.aiInterview.requestDto.FollowUpQuestionRequest;
import com.aitserver.aiInterview.requestDto.NonVerbalDataRequest;
import com.aitserver.aiInterview.responseDto.*;
import com.aitserver.aiInterview.service.AiInterviewAsyncService;
import com.aitserver.aiInterview.service.AiInterviewService;
import com.aitserver.aiInterview.service.SpeechTranscriptionService;
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

import java.util.List;

@RestController
@RequestMapping("/api/ai-interviews")
@RequiredArgsConstructor
public class AiInterviewController {

    private final AiInterviewService aiInterviewService;
    private final AiInterviewAsyncService asyncService;
    private final SpeechTranscriptionService speechTranscriptionService;

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
            @RequestPart(value = "questionRequest")
            FollowUpQuestionRequest questionRequest, // 사용자가 답변한 질문 정보
            @RequestPart(value = "audioFile") MultipartFile audioFile, // 사용자의 답변 음성 파일
            HttpServletRequest request) {
        // 질문과 사용자의 답변을 전달해서, 꼬리 질문을 생성
        FollowUpQuestionResponse response = aiInterviewService.answerCheckForFollowUp(userId, aiInterviewId, questionRequest, audioFile);

        return ResponseEntity.status(HttpStatus.OK).body(
                ApiResponse.success(
                        HttpStatus.OK,
                        "사용자 답변 분석 완료",
                        response,
                        request
                )
        );
    }

    @PostMapping(
            value = "/speech/stt",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<SpeechTranscriptionResponse>> transcribeSpeech(
            @RequestPart("media") MultipartFile media,
            HttpServletRequest request) {
        SpeechTranscriptionResponse response =
                speechTranscriptionService.transcribe(media);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "음성 변환 완료",
                response,
                request
        ));
    }

    @PostMapping("/{aiInterviewId}/non-verbal") // 표정과 시선 분석
    public ResponseEntity<ApiResponse<Void>> nonVerbalCheck(
            HttpServletRequest request,
            @AuthenticationPrincipal Long userId,
            @PathVariable Long aiInterviewId,
            @RequestBody NonVerbalDataRequest nonVerbalDataRequest) {

        asyncService.nonVerbalDataAnalysisAsync(userId, aiInterviewId, nonVerbalDataRequest);

        return ResponseEntity.ok( // 비동기로만 처리하기 때문에 data는 없다.
                ApiResponse.success(
                        HttpStatus.OK, "시선 및 표정 데이터 분석 요청 완료", null, request));
    }


    @PostMapping("{aiInterviewId}/complete")
    public ResponseEntity<ApiResponse<Void>> complete(
            HttpServletRequest request,
            @AuthenticationPrincipal Long userId,
            @PathVariable Long aiInterviewId) {

        asyncService.interviewComplete(userId, aiInterviewId);

        return ResponseEntity.ok( // 전달 받은 요청만 처리하는 거라서 data는 없다.
                ApiResponse.success(
                        HttpStatus.OK, "모의 면접이 종료되어 결과를 분석하고 있습니다.", null, request));
    }

    @GetMapping("/result")
    public ResponseEntity<ApiResponse<List<ReportListResponse>>> getList(
            HttpServletRequest request,
            @AuthenticationPrincipal Long userId) {

        List<ReportListResponse> response = aiInterviewService.getList(userId);

        return ResponseEntity.ok( // 리스트 반환
                ApiResponse.success(
                        HttpStatus.OK, "모의 면접 결과 목록을 조회했습니다.", response, request));
    }

    @GetMapping("/{aiInterviewId}/result")
    public ResponseEntity<ApiResponse<AiInterviewDetailResponse>> getInterviewDetail(
            HttpServletRequest request,
            @AuthenticationPrincipal Long userId,
            @PathVariable Long aiInterviewId) {

        AiInterviewDetailResponse response = aiInterviewService.getInterviewDetail(userId, aiInterviewId);

        return ResponseEntity.ok( // 상세정보 반환
                ApiResponse.success(
                        HttpStatus.OK, "모의 면접 결과 목록을 조회했습니다.", response, request));
    }

}
