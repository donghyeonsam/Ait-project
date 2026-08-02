package com.aitserver.auth.controller;

import com.aitserver.auth.oauthDto.OAuthLoginRequest;
import com.aitserver.auth.oauthDto.OAuthLoginResponse;
import com.aitserver.auth.oauthDto.OAuthLoginResult;
import com.aitserver.auth.service.OAuthService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/oauth")
@RequiredArgsConstructor
public class OAuthController {

    private final OAuthService oAuthService;

    @PostMapping("/{provider}")
    public ResponseEntity<ApiResponse<OAuthLoginResponse>> oauthLogin(
            HttpServletRequest request,
            HttpServletResponse response,
            @PathVariable String provider,
            @RequestBody @Valid OAuthLoginRequest oAuthRequest) {

        OAuthLoginResult result = oAuthService.login(provider, oAuthRequest.code(), oAuthRequest.redirectUri());

        // RefreshToken은 HttpOnly 쿠키로만 전달 (일반 로그인과 동일)
        ResponseCookie refreshTokenCookie = ResponseCookie.from("refreshToken", result.refreshToken())
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(7 * 24 * 60 * 60) // 7일
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString());

        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "OAuth 로그인 및 가입에 성공하였습니다.",
                        result.response(),
                        request
                ));
    }
}
