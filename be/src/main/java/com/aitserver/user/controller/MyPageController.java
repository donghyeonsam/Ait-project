package com.aitserver.user.controller;


import com.aitserver.global.response.ApiResponse;
import com.aitserver.user.dto.MyPageUpdateRequest;
import com.aitserver.user.dto.MyPageResponse;
import com.aitserver.user.service.MyPageService;
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
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class MyPageController {

    private final MyPageService myPageService;

     // 내 정보 조회
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MyPageResponse>> getMyPage(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        MyPageResponse response =
                myPageService.getMyPage(userId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "내 정보 조회 성공",
                        response,
                        request
                ));
    }


     // 내 정보 통합 수정
     // request: 닉네임, 관심 직무, 기술 스택, 레포 별칭
     // profileImage: 새 프로필 이미지, 선택 사항

    @PutMapping(
            value = "/me",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<ApiResponse<MyPageResponse>> updateMyPage(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestPart("request") MyPageUpdateRequest myPageUpdateRequest,
            HttpServletRequest request,
            @RequestPart(value = "profileImage", required = false) MultipartFile profileImage
    ) {
        MyPageResponse response = myPageService.updateMyPage(userId, myPageUpdateRequest, profileImage);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "내 정보 수정 성공",
                        response,
                        request
                ));
    }
}