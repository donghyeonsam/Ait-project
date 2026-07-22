package com.aitserver.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // Common
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "COMMON_001", "입력값 중에 기준을 만족하지 않은 입력값이 있습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_002", "서버 내부 오류가 발생했습니다."),

    // Auth 관련
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "AUTH_001", "이미 사용 중인 이메일입니다."),
    DUPLICATE_NICKNAME(HttpStatus.CONFLICT, "AUTH_002", "이미 사용 중인 닉네임입니다."),

    // resume
    RESUME_NOT_FOUND(HttpStatus.NOT_FOUND, "RESUME_001", "이력서를 찾을 수 없습니다."),
    RESUME_ACCESS_DENIED(HttpStatus.FORBIDDEN, "RESUME_002", "해당 이력서를 수정할 권한이 없습니다."),
    INVALID_RESUME_DATE_RANGE(HttpStatus.BAD_REQUEST, "RESUME_003", "종료일은 시작일보다 빠를 수 없습니다."),

    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "AUTH_003", "아이디 혹은 비밀번호가 일치하지 않습니다."),
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "AUTH_004", "아이디 혹은 비밀번호가 일치하지 않습니다.");

    // 테스트용 임시
//    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "TEST_001", "테스트용 USER_NOT_FOUND입니다");

    private final HttpStatus status;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}