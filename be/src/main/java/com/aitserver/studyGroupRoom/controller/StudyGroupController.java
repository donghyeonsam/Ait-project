package com.aitserver.studyGroupRoom.controller;

import com.aitserver.global.response.ApiResponse;
import com.aitserver.studyGroupRoom.domain.StudyGroupStatus;
import com.aitserver.studyGroupRoom.dto.group.GroupDetailResponse;
import com.aitserver.studyGroupRoom.dto.group.MyStudyGroupResponseDto;
import com.aitserver.studyGroupRoom.dto.group.StudyGroupListResponseDto;
import com.aitserver.studyGroupRoom.dto.group.StudyGroupRequestDto;
import com.aitserver.studyGroupRoom.service.group.StudyGroupCommandService;
import com.aitserver.studyGroupRoom.service.group.StudyGroupService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/study-groups")
@RequiredArgsConstructor
public class StudyGroupController {

    private final StudyGroupService studyGroupService;
    private final StudyGroupCommandService studyGroupCommandService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<StudyGroupListResponseDto>>> getStudyGroups(
            @RequestParam(required = false) StudyGroupStatus status,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 6, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        Page<StudyGroupListResponseDto> response = studyGroupService.getStudyGroups(status, keyword, userId, pageable);

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

    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<GroupDetailResponse>> getGroupDetail(
            @PathVariable Long groupId,
            @AuthenticationPrincipal Long currentUserId,
            HttpServletRequest request) {

        // 1. 서비스 로직 호출 (권한 검증 포함)
        GroupDetailResponse response = studyGroupService.getGroupDetail(groupId, currentUserId);

        // 2. 약속된 공통 응답 포맷으로 반환
        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "그룹 상세 정보 조회 성공.",
                response,
                request
        ));
    }

    // 생성
    @PostMapping
    public ResponseEntity<ApiResponse<Long>> createGroup(
            @RequestBody StudyGroupRequestDto.Create request,
            @AuthenticationPrincipal Long currentUserId,
            HttpServletRequest servletRequest) {

        Long newGroupId = studyGroupCommandService.createGroup(request, currentUserId);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.CREATED,
                "스터디 그룹 생성 성공.",
                newGroupId,
                servletRequest
        ));
    }

    // [U] 상태 변경
    @PatchMapping("/{groupId}/status")
    public ResponseEntity<ApiResponse<Void>> updateGroupStatus(
            @PathVariable Long groupId,
            @RequestBody StudyGroupRequestDto.UpdateStatus request,
            @AuthenticationPrincipal Long currentUserId,
            HttpServletRequest servletRequest) {

        studyGroupCommandService.updateGroupStatus(groupId, request, currentUserId);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "스터디 그룹 상태 변경 성공.",
                null,
                servletRequest
        ));
    }

    // [D] 나가기 (폭파 포함)
    @DeleteMapping("/{groupId}/leave")
    public ResponseEntity<ApiResponse<Void>> leaveGroup(
            @PathVariable Long groupId,
            @AuthenticationPrincipal Long currentUserId,
            HttpServletRequest servletRequest) {

        studyGroupCommandService.leaveOrDeleteGroup(groupId, currentUserId);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "스터디 그룹 나가기 처리 성공.",
                null,
                servletRequest
        ));
    }

    // [D] 멤버 추방 (방장 전용)
    @DeleteMapping("/{groupId}/members/{targetUserId}")
    public ResponseEntity<ApiResponse<Void>> kickMember(
            @PathVariable Long groupId,
            @PathVariable Long targetUserId,
            @AuthenticationPrincipal Long currentUserId,
            HttpServletRequest servletRequest) {

        studyGroupCommandService.kickMember(groupId, targetUserId, currentUserId);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "멤버를 성공적으로 추방했습니다.",
                null,
                servletRequest
        ));
    }
}
