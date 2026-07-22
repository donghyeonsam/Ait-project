package com.aitserver.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // Common
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "COMMON_001", "입력값 중에 기준을 만족하지 않은 입력값이 있습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_002", "서버 내부 오류가 발생했습니다."),

    // 테스트용 임시
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "TEST_001", "테스트용 USER_NOT_FOUND입니다"),

    //GITHUB 관련 에러
    GITHUB_APP_NOT_FOUND(HttpStatus.NOT_FOUND, "GITHUB_001", "깃허브 연동 정보가 존재하지 않습니다."),
    GITHUB_TOKEN_ISSUE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "GITHUB_002", "깃허브 토큰 발급 중 오류가 발생했습니다."),
    GITHUB_REPO_SYNC_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "GITHUB_003","레포지토리 동기화 중 오류가 발생했습니다.");
    private final HttpStatus status;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}