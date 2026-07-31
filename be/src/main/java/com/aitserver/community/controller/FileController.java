package com.aitserver.community.controller;

import com.aitserver.global.file.FileStorageService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    /**
     * 단일 파일 업로드
     * 프론트엔드에서 multipart/form-data 형식으로 파일을 던지면 UUID 파일명을 반환합니다.
     */
    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<String>> uploadFile(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) { // ApiResponse에 URI를 넘겨주기 위해 추가

        String storedFilename = fileStorageService.storeFile(file);

        // 공통 응답 포맷으로 감싸서 반환 (data 부분에 파일명이 들어감)
        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "파일 업로드 성공",
                storedFilename,
                request
        ));
    }

    /**
     * 다중 파일 업로드 (첨부파일용)
     */
    @PostMapping("/uploads")
    public ResponseEntity<ApiResponse<List<String>>> uploadFiles(
            @RequestParam("files") List<MultipartFile> files,
            HttpServletRequest request) {

        List<String> storedFilenames = fileStorageService.storeFiles(files);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "다중 파일 업로드 성공",
                storedFilenames,
                request
        ));
    }
}