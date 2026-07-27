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
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "AUTH_003", "아이디 혹은 비밀번호가 일치하지 않습니다."),
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "AUTH_004", "아이디 혹은 비밀번호가 일치하지 않습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH_005", "토큰이 존재하지 않습니다."),

    // resume
    RESUME_NOT_FOUND(HttpStatus.NOT_FOUND, "RESUME_001", "이력서를 찾을 수 없습니다."),
    RESUME_ACCESS_DENIED(HttpStatus.FORBIDDEN, "RESUME_002", "해당 이력서를 수정할 권한이 없습니다."),
    INVALID_RESUME_DATE_RANGE(HttpStatus.BAD_REQUEST, "RESUME_003", "종료일은 시작일보다 빠를 수 없습니다."),

    // cover-letter
    COVER_LETTER_NOT_FOUND(HttpStatus.NOT_FOUND, "COVER_LETTER_001", "자기소개서를 찾을 수 없습니다."),
    DUPLICATE_COVER_LETTER_CONTENT_ORDER(HttpStatus.BAD_REQUEST, "COVER_LETTER_002", "자기소개서 문항 순서는 중복될 수 없습니다."),

    // AI 모의 면접 관련 에러
    FASTAPI_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "AI_INTERVIEW_001", "AI 질문 생성 중 서버 에러 발생"),

    //GITHUB 관련 에러
    GITHUB_APP_NOT_FOUND(HttpStatus.NOT_FOUND, "GITHUB_001", "깃허브 연동 정보가 존재하지 않습니다."),
    GITHUB_TOKEN_ISSUE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "GITHUB_002", "깃허브 토큰 발급 중 오류가 발생했습니다."),
    GITHUB_REPO_SYNC_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "GITHUB_003","레포지토리 동기화 중 오류가 발생했습니다."),
    GITHUB_REPO_NOT_FOUND(HttpStatus.NOT_FOUND, "GITHUB_004", "해당 레포지토리를 찾을 수 없거나 권한이 없습니다."),
    GITHUB_ANALYSIS_PARSE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "GITHUB_005", "GMS 응답에서 JSON 추출을 실패했습니다."),
    GITHUB_PROMPT_LOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "GITHUB_006", "프롬프트 파일 로드에 실패했습니다."),

    // 그룹 스터디 세션 에러
    GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "G001", "해당 그룹을 찾을 수 없습니다."),
    GROUP_ACCESS_DENIED(HttpStatus.FORBIDDEN, "G002", "해당 그룹에 접근할 권한이 없습니다. (멤버가 아님)");

    private final HttpStatus status;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}