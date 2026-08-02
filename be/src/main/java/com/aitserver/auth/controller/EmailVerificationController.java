package com.aitserver.auth.controller;


import com.aitserver.auth.dto.EmailCodeSendRequest;
import com.aitserver.auth.dto.EmailCodeVerifyRequest;
import com.aitserver.auth.dto.EmailVerificationResponse;
import com.aitserver.auth.service.EmailVerificationService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/email")
@RequiredArgsConstructor
public class EmailVerificationController {

    private final EmailVerificationService emailVerificationService;

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<Void>> send(
            @Valid @RequestBody EmailCodeSendRequest emailCodeSendRequest,
            HttpServletRequest request
    ) {

        emailVerificationService.sendVerificationCode(emailCodeSendRequest.getEmail());

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "이메일 인증번호 전송에 성공했습니다.",
                        request
                ));
    }

    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<EmailVerificationResponse>> verify(
            @Valid @RequestBody EmailCodeVerifyRequest emailCodeVerifyRequest,
            HttpServletRequest request
    ) {

        emailVerificationService.verifyCode(emailCodeVerifyRequest.getEmail(), emailCodeVerifyRequest.getVerificationCode());

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "이메일 인증번호 검증에 성공했습니다.",
                        EmailVerificationResponse.success(),
                        request
                ));
    }
}