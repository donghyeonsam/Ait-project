package com.aitserver.coverletter.controller;


import com.aitserver.coverletter.dto.CoverLetterCreateRequest;
import com.aitserver.coverletter.dto.CoverLetterDetailResponse;
import com.aitserver.coverletter.dto.CoverLetterListResponse;
import com.aitserver.coverletter.dto.CoverLetterUpdateRequest;
import com.aitserver.coverletter.service.CoverLetterService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/cover-letters")

public class CoverLetterController {

    private final CoverLetterService coverLetterService;

    // 내 자소서 목록 조회
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<CoverLetterListResponse>> getMyCoverLetterList(
            // jwt
            HttpServletRequest request
    ){

        Long userId = 1L;   // 일단 하드코딩
        CoverLetterListResponse coverLetterListResponse = coverLetterService.getList(userId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "자기소개서 목록 조회에 성공하였습니다.",
                        coverLetterListResponse,
                        request
                ));
    }

    // 자소서 상세 조회
    @GetMapping("/{coverLetterId}")
    public ResponseEntity<ApiResponse<CoverLetterDetailResponse>> getDetails(
            // jwt
            @PathVariable Long coverLetterId,
            HttpServletRequest request
    ){
        Long userId = 1L;   // 임시 하드코딩
        CoverLetterDetailResponse coverLetterDetailResponse = coverLetterService.getDetail(coverLetterId, userId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "자기소개서 상세 조회에 성공하였습니다.",
                        coverLetterDetailResponse,
                        request
                ));
    }


    // 자소서 생성
    @PostMapping
    public ResponseEntity<ApiResponse<CoverLetterDetailResponse>>
    createCoverLetter(
            // jwt
            @Valid @RequestBody CoverLetterCreateRequest coverLetterCreateRequest,
            HttpServletRequest request
    ) {
        Long userId = 1L;

        CoverLetterDetailResponse response =
                coverLetterService.createCoverLetter(
                        userId,
                        coverLetterCreateRequest
                );

        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "자기소개서를 생성했습니다.",
                        response,
                        request
                )
        );
    }

    @PutMapping("/{coverLetterId}")
    public ResponseEntity<ApiResponse<CoverLetterDetailResponse>>
    updateCoverLetter(
            // jwt
            @PathVariable Long coverLetterId,
            @Valid @RequestBody CoverLetterUpdateRequest coverLetterUpdateRequest,
            HttpServletRequest request
    ) {
        Long userId = 1L;   // 임시

        CoverLetterDetailResponse response =
                coverLetterService.updateCoverLetter(
                        userId,
                        coverLetterId,
                        coverLetterUpdateRequest
                );

        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "자기소개서를 수정했습니다.",
                        response,
                        request
                )
        );
    }

    @DeleteMapping("/{coverLetterId}")
    public ResponseEntity<ApiResponse<Void>> deleteCoverLetter(
            // jwt
            @PathVariable Long coverLetterId,
            HttpServletRequest request
    ) {
        Long userId = 1L;

        coverLetterService.deleteCoverLetter(
                userId,
                coverLetterId
        );

        return ResponseEntity.ok(
                ApiResponse.success(
                        HttpStatus.OK,
                        "자기소개서를 삭제했습니다.",
                        request
                )
        );
    }

}
