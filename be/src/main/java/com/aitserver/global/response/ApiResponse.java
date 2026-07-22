package com.aitserver.global.response;

import jakarta.servlet.http.HttpServletRequest;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.time.Instant;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApiResponse<T> {

    private final int statusCode;
    private final String timestamp;
    private final String path;
    private final String message;
    private final T data;
    private final Object error;

    public static <T> ApiResponse<T> success(
            HttpStatus status,
            String message,
            T data,
            HttpServletRequest request
    ) {
        return new ApiResponse<>(
                status.value(),
                Instant.now().toString(),
                request.getRequestURI(),
                message,
                data,
                null
        );
    }

    public static ApiResponse<Void> success(
            HttpStatus status,
            String message,
            HttpServletRequest request
    ) {
        return new ApiResponse<>(
                status.value(),
                Instant.now().toString(),
                request.getRequestURI(),
                message,
                null,
                null
        );
    }

    public static ApiResponse<Void> fail(
            HttpStatus status,
            String message,
            Object error,
            HttpServletRequest request
    ) {
        return new ApiResponse<>(
                status.value(),
                Instant.now().toString(),
                request.getRequestURI(),
                message,
                null,
                error
        );
    }
}