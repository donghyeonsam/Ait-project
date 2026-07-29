package com.aitserver.studyGroupRoom.controller;

import com.aitserver.global.response.ApiResponse;
import com.aitserver.studyGroupRoom.dto.application.ApplicationCreateRequest;
import com.aitserver.studyGroupRoom.dto.application.ApplicationProcessRequest;
import com.aitserver.studyGroupRoom.dto.application.ApplicationResponse;
import com.aitserver.studyGroupRoom.service.application.StudyGroupApplicationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/study-groups/{groupId}/applications")
@RequiredArgsConstructor
public class StudyGroupApplicationController {

    private final StudyGroupApplicationService applicationService;

    // 1. 가입 신청하기
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> applyToGroup(
            @PathVariable Long groupId,
            @AuthenticationPrincipal Long currentUserId,
            @RequestBody ApplicationCreateRequest requestDto,
            HttpServletRequest servletRequest) {

        applicationService.applyToGroup(groupId, currentUserId, requestDto);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        HttpStatus.CREATED,
                        "스터디 가입 신청이 완료되었습니다.",
                        servletRequest
                ));
    }

    // 2. 가입 신청 목록 조회 (방장 전용)
    @GetMapping
    public ResponseEntity<ApiResponse<List<ApplicationResponse>>> getApplications(
            @PathVariable Long groupId,
            @AuthenticationPrincipal Long currentUserId,
            HttpServletRequest servletRequest) {

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "가입 신청 목록 조회 성공",
                applicationService.getApplications(groupId, currentUserId),
                servletRequest
        ));
    }

    // 3. 가입 신청 승인 및 거절 (방장 전용)
    @PatchMapping("/{applicationId}")
    public ResponseEntity<ApiResponse<Void>> processApplication(
            @PathVariable Long groupId,
            @PathVariable Long applicationId,
            @AuthenticationPrincipal Long currentUserId,
            @RequestBody ApplicationProcessRequest requestDto,
            HttpServletRequest servletRequest) {

        applicationService.processApplication(groupId, applicationId, currentUserId, requestDto);

        String resultMessage = requestDto.isApprove() ? "가입 신청을 승인했습니다." : "가입 신청을 거절했습니다.";

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                resultMessage,
                servletRequest
        ));
    }
}