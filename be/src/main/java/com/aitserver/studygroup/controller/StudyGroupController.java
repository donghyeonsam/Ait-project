package com.aitserver.studygroup.controller;

import com.aitserver.global.response.ApiResponse;
import com.aitserver.studygroup.dto.MyStudyGroupResponseDto;
import com.aitserver.studygroup.service.StudyGroupService;
import com.aitserver.studygroup.dto.StudyGroupListResponseDto;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/study-groups")
@RequiredArgsConstructor
public class StudyGroupController {

    private final StudyGroupService studyGroupService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<StudyGroupListResponseDto>>> getStudyGroups(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable, //TODO: 한페이지 당 개수 여쭤보기
            HttpServletRequest request
    ) {
        Page<StudyGroupListResponseDto> response = studyGroupService.getStudyGroups(status, keyword, pageable);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "스터디 그룹 목록 조회 성공.",
                response,
                request
        ));
    }

    // 1. 내가 가입한 '모든' 스터디 그룹 조회
    @GetMapping("/me/all")
    public ResponseEntity<ApiResponse<List<MyStudyGroupResponseDto>>> getAllMyStudyGroups(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        List<MyStudyGroupResponseDto> response = studyGroupService.getAllMyStudyGroups(userId);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "내 모든 스터디 그룹 목록 조회 성공.",
                response,
                request
        ));
    }

    // 2. 내가 가입한 '진행 중인(종료되지 않은)' 스터디 그룹 조회
    @GetMapping("/me/active")
    public ResponseEntity<ApiResponse<List<MyStudyGroupResponseDto>>> getActiveMyStudyGroups(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        List<MyStudyGroupResponseDto> response = studyGroupService.getActiveMyStudyGroups(userId);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "진행 중인 내 스터디 그룹 목록 조회 성공.",
                response,
                request
        ));
    }
}