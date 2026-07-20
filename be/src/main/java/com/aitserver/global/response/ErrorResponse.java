package com.aitserver.global.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ErrorResponse {

    private final String code;

    public static ErrorResponse of(String code) {
        return new ErrorResponse(code);
    }
}