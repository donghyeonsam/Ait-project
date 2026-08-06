package com.aitserver.studyGroupRoom.controller;

import com.aitserver.global.file.FileCategory;
import com.aitserver.global.file.FileStorageService;
import com.aitserver.global.response.ApiResponse;
import com.aitserver.studyGroupRoom.dto.chat.StudyGroupFileDto;
import com.aitserver.studyGroupRoom.service.chat.StudyGroupFileService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/study-groups")
@RequiredArgsConstructor
public class StudyGroupFileController {

    private final FileStorageService fileStorageService;
    private final StudyGroupFileService fileService;
    /**
     * 채팅방 파일 단일 업로드
     */
    @PostMapping("/files/upload")
    public ResponseEntity<ApiResponse<String>> uploadChatFile(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {

        String storedFilename = fileStorageService.storeFile(file, FileCategory.CHAT);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "채팅 파일 업로드 성공",
                storedFilename,
                request
        ));
    }

    @PostMapping("/files/uploads")
    public ResponseEntity<ApiResponse<List<String>>> uploadChatFiles(
            @RequestParam("files") List<MultipartFile> files,
            HttpServletRequest request) {

        List<String> storedFilenames = fileStorageService.storeFiles(files, FileCategory.CHAT);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "채팅 다중 파일 업로드 성공",
                storedFilenames,
                request
        ));
    }

    @GetMapping("/{groupId}/files")
    public ResponseEntity<ApiResponse<Page<StudyGroupFileDto.Response>>> getGroupFiles(
            @PathVariable Long groupId,
            @AuthenticationPrincipal Long currentUserId,
            @PageableDefault(size = 20) Pageable pageable,
            HttpServletRequest request) {

        Page<StudyGroupFileDto.Response> fileResponses = fileService.getGroupFiles(groupId, currentUserId, pageable);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "채팅방 파일 모아보기 조회 성공",
                fileResponses,
                request
        ));
    }
}
