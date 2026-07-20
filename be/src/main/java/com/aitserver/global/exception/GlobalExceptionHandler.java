package com.aitserver.global.exception;

import com.aitserver.global.response.ApiResponse;
import com.aitserver.global.response.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 비즈니스 로직 수행 중 발생한 예외를 처리한다.
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(
            BusinessException e,
            HttpServletRequest request
    ) {
        ErrorCode errorCode = e.getErrorCode();

        log.warn("BusinessException 발생. path={}, code={}, message={}",
                request.getRequestURI(),
                errorCode.getCode(),
                errorCode.getMessage()
        );

        ErrorResponse errorResponse = ErrorResponse.of(errorCode.getCode());

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.fail(
                        errorCode.getStatus(),
                        errorCode.getMessage(),
                        errorResponse,
                        request
                ));
    }

    // 요청 DTO의 필드 검증 실패 예외 처리 -> Valid
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException e,
            HttpServletRequest request
    ) {
        e.getBindingResult().getFieldErrors().forEach(error ->
                log.warn("Validation 실패. path={}, field={}, rejectedValue={}, message={}",
                        request.getRequestURI(),
                        error.getField(),
                        error.getRejectedValue(),
                        error.getDefaultMessage()
                )
        );

        ErrorCode errorCode = ErrorCode.INVALID_INPUT_VALUE;

        ErrorResponse errorResponse = ErrorResponse.of(errorCode.getCode());

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.fail(
                        errorCode.getStatus(),
                        errorCode.getMessage(),
                        errorResponse,
                        request
                ));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException e,
            HttpServletRequest request
    ) {
        log.warn("Request Body 파싱 실패. path={}, message={}",
                request.getRequestURI(),
                e.getMessage()
        );

        ErrorCode errorCode = ErrorCode.INVALID_INPUT_VALUE;

        ErrorResponse errorResponse = ErrorResponse.of(errorCode.getCode());

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.fail(
                        errorCode.getStatus(),
                        errorCode.getMessage(),
                        errorResponse,
                        request
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(
            Exception e,
            HttpServletRequest request
    ) {
        log.error("서버 내부 오류 발생. path={}, message={}",
                request.getRequestURI(),
                e.getMessage(),
                e
        );

        ErrorCode errorCode = ErrorCode.INTERNAL_SERVER_ERROR;

        ErrorResponse errorResponse = ErrorResponse.of(errorCode.getCode());

        return ResponseEntity
                .status(errorCode.getStatus())
                .body(ApiResponse.fail(
                        errorCode.getStatus(),
                        errorCode.getMessage(),
                        errorResponse,
                        request
                ));
    }
}