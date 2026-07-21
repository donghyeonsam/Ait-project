package com.aitserver.auth.controller;

import com.aitserver.auth.dto.SignupRequest;
import com.aitserver.auth.service.AuthService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
    // 일반 로그아웃
}
