package com.aitserver.studygroup.controller;

import com.aitserver.studygroup.service.StudyGroupService;
import com.aitserver.studygroup.dto.StudyGroupListResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/study-groups")
@RequiredArgsConstructor
public class StudyGroupController {

    private final StudyGroupService studyGroupService;

    @GetMapping
    public ResponseEntity<Page<StudyGroupListResponseDto>> getStudyGroups(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable //TODO: 한페이지 당 개수 여쭤보기
    ) {
        Page<StudyGroupListResponseDto> response = studyGroupService.getStudyGroups(status, keyword, pageable);
        return ResponseEntity.ok(response);
    }
}