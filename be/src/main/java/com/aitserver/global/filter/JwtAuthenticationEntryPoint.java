package com.aitserver.global.filter;

import com.aitserver.global.exception.ErrorCode;
import com.aitserver.global.response.ApiResponse;
import com.aitserver.global.response.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/*
 * 인증되지 않은(만료·누락된 토큰) 요청을 GlobalExceptionHandler와 동일한
 * 형식의 401 JSON으로 응답한다. 이 클래스가 없으면 Spring Security 기본
 * entry point가 동작해 401 대신 403이 내려가고, 프론트의 자동 재발급
 * 트리거(response.status === 401)가 걸리지 않는다.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException
    ) throws IOException {
        ErrorCode errorCode = ErrorCode.UNAUTHORIZED;

        response.setStatus(errorCode.getStatus().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        ApiResponse<Void> body = ApiResponse.fail(
                errorCode.getStatus(),
                errorCode.getMessage(),
                ErrorResponse.of(errorCode.getCode()),
                request
        );

        response.getWriter().write(
                objectMapper.writeValueAsString(body)
        );
    }
}
