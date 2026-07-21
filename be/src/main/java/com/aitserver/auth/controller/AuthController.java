package com.aitserver.auth.controller;

import com.aitserver.auth.dto.LoginRequest;
import com.aitserver.auth.dto.LoginResponse;
import com.aitserver.auth.dto.SignupRequest;
import com.aitserver.auth.service.AuthService;
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
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // 일반 회원가입
    @PostMapping("/signup")
    ResponseEntity<ApiResponse<Void>> signup(HttpServletRequest request, @RequestBody @Valid SignupRequest signupRequest) {
        authService.insert(signupRequest);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        HttpStatus.CREATED,
                        "회원가입 성공",
                        request
                ));
    }

    // 일반 로그인
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(HttpServletRequest request, HttpServletResponse response,
                                                            @RequestBody @Valid LoginRequest loginRequest) {
        // 로그인한 사용자의 정보
        LoginResponse loginResponse = authService.login(loginRequest);
        // RefreshToken을 담을 HttpOnly 쿠키
        ResponseCookie refreshTokenCookie = ResponseCookie.from("refreshToken", loginResponse.refreshToken())
                .httpOnly(true) // 자바스크립트 접근 불가
                .secure(true) // HTTPS 환경 적용
                .path("/")
                .maxAge(7 * 24 * 60 * 60) // 7일간 유지
                .sameSite("Strict") // CSRF 방지
                .build();

        // 응답 헤더에 refreshToken 추가
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString());
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "로그인 성공",
                        loginResponse,
                        request
                ));
    }

    // 일반 로그아웃
    @PostMapping("/logout")
    ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request) {
        // @AuthenticationPrincipal을 통해서 Long userId를 받아와라
        // 그런데 그거 하려면 filter 거쳐야 한다.
        // 받아왔으면 refreshToken 블랙 리스트에 넣어라


        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "로그아웃 성공",
                        request
                ));
    }
}
