package com.aitserver.user.controller;


import com.aitserver.auth.service.AuthService;
import com.aitserver.global.response.ApiResponse;
import com.aitserver.user.dto.*;
import com.aitserver.user.service.MyPagePostService;
import com.aitserver.user.service.MyPageService;
import com.aitserver.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class MyPageController {

    private final MyPageService myPageService;
    private final MyPagePostService myPagePostService;
    private final UserService userService;
    private final AuthService authService;

     // 내 정보 조회
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MyPageResponse>> getMyPage(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        MyPageResponse response =
                myPageService.getMyPage(userId);

//        String profileImage = "" + response.getProfileImageUrl();
//        response.setProfileImageUrl(profileImage);

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


    @GetMapping ("/nickname/check")
    public ResponseEntity<ApiResponse<NicknameCheckResponse>> getMyPageNickname(
            @AuthenticationPrincipal Long userId,
            @RequestParam(value = "nickname", required = false) String nickname,
            HttpServletRequest request
    ){

        Boolean avaliable = myPageService.isNicknameAvailable(nickname);

        NicknameCheckResponse response = NicknameCheckResponse.builder()
                .canUse(avaliable)
                .build();

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "닉네임 사용 가능 여부 조회 성공",
                        response,
                        request
                ));
    }


    // 내가 작성한 게시글 조회
    @GetMapping("/me/post")
    public ResponseEntity<ApiResponse<Page<MyPagePostResponse>>> postMyPage(
            @ParameterObject
            @PageableDefault(
                    page = 0,
                    size = 10,
                    sort = "createdAt",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ){

        Page<MyPagePostResponse> response = myPagePostService.getMyPagePosts(pageable, userId);


        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "내가 작성한 게시글 조회에 성공했습니다.",
                        response,
                        request
                ));
    }


    // 내가 저장한 게시글 조회

    @GetMapping("/me/post/scrap")
    public ResponseEntity<ApiResponse<Page<MyPagePostResponse>>> scrapMyPage(
            @ParameterObject
            @PageableDefault(
                    page = 0,
                    size = 10,
                    sort = "createdAt",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ){

        Page<MyPagePostResponse> response = myPagePostService.getMyScrappedPosts(pageable, userId);


        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "내가 스크랩한 게시글 조회에 성공했습니다.",
                        response,
                        request
                ));
    }


    // 내가 좋아요한 게시글 조회
    @GetMapping("/me/post/like")
    public ResponseEntity<ApiResponse<Page<MyPagePostResponse>>> likeMyPage(
            @ParameterObject
            @PageableDefault(
                    page = 0,
                    size = 10,
                    sort = "createdAt",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ){

        Page<MyPagePostResponse> response = myPagePostService.getMyLikedPosts(pageable, userId);


        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "내가 좋아요한 게시글 조회에 성공했습니다.",
                        response,
                        request
                ));
    }

    // 비밀번호 변경
    @PutMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestPart ChangePasswordRequest changePasswordRequest,
            HttpServletRequest request
    ){

        userService.changePassword(userId, changePasswordRequest);


        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "비밀번호 변경에 성공했습니다.",
                        request
                ));
    }


    // 회원탈퇴
    @DeleteMapping("/withdraw")
    public ResponseEntity<ApiResponse<Void>> withdraw(
            HttpServletRequest request,
            HttpServletResponse response,
            @AuthenticationPrincipal Long userId,
            @RequestBody @Valid WithdrawRequest withdrawRequest
    ) {
        String bearerToken = request.getHeader("Authorization");
        String accessToken = null;

        if (StringUtils.hasText(bearerToken)
                && bearerToken.startsWith("Bearer ")) {

            accessToken = bearerToken.substring(7);
        }


        // 회원 소프트 삭제 + 토큰 무효화
        userService.withdraw(
                userId,
                withdrawRequest
        );

        // 리프레시 토큰 삭제, 엑세스 토큰 블랙리스트
        authService.logout(userId, accessToken);



        // 브라우저의 refreshToken 쿠키 삭제
        ResponseCookie refreshTokenCookie =
                ResponseCookie.from("refreshToken", "")
                        .httpOnly(true)
                        .secure(true)
                        .path("/")
                        .maxAge(0)
                        .sameSite("Strict")
                        .build();

        response.addHeader(
                HttpHeaders.SET_COOKIE,
                refreshTokenCookie.toString()
        );

        return ResponseEntity.status(HttpStatus.OK)
                .body(
                        ApiResponse.success(
                                HttpStatus.OK,
                                "회원탈퇴가 완료되었습니다.",
                                request
                        )
                );
    }


}