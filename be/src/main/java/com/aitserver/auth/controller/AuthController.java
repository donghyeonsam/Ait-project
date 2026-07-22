package com.aitserver.auth.controller;

import com.aitserver.auth.dto.SignupRequest;
import com.aitserver.auth.service.AuthService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
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
    // 일반 로그아웃
<<<<<<< Updated upstream
=======
    @PostMapping("/logout")
    ResponseEntity<ApiResponse<Void>> logout(
            HttpServletRequest request,
            HttpServletResponse response,
            @AuthenticationPrincipal Long userId) {
        String bearerToken = request.getHeader("Authorization");
        String accessToken = null;

        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            accessToken = bearerToken.substring(7);
        }
        // 로그아웃 로직 수행
        authService.logout(userId, accessToken);
        // 브라우저의 refreshToken 쿠키 삭제
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(true) // HTTPS 환경인 경우 true
                .path("/")
                .maxAge(0) // 빈 값에 유효시간도 0으로 하면 도착하자마자 만료
                .sameSite("Strict")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "로그아웃 성공",
                        request
                ));
    }
>>>>>>> Stashed changes
}
