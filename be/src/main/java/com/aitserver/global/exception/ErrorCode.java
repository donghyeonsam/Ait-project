package com.aitserver.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {


    NO_USER(HttpStatus.NOT_FOUND, "U001", "존재하지 않는 사용자입니다."),

    // Common
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "COMMON_001", "입력값 중에 기준을 만족하지 않은 입력값이 있습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_002", "서버 내부 오류가 발생했습니다."),

    // Auth 관련
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "AUTH_001", "이미 사용 중인 이메일입니다."),
    DUPLICATE_NICKNAME(HttpStatus.CONFLICT, "AUTH_002", "이미 사용 중인 닉네임입니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "AUTH_003", "아이디 혹은 비밀번호가 일치하지 않습니다."),
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "AUTH_004", "아이디 혹은 비밀번호가 일치하지 않습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH_005", "토큰이 존재하지 않습니다."),
    // OAUTH 관련
    UNSUPPORTED_OAUTH_PROVIDER(HttpStatus.BAD_REQUEST, "OAUTH_001", "지원하지 않는 소셜 로그인입니다."),
    INVALID_REDIRECT_URI(HttpStatus.BAD_REQUEST, "OAUTH_002", "허용되지 않은 redirect_uri 입니다."),
    OAUTH_TOKEN_FAILED(HttpStatus.UNAUTHORIZED, "OAUTH_003", "소셜 토큰 발급에 실패했습니다."),
    OAUTH_USERINFO_FAILED(HttpStatus.UNAUTHORIZED, "OAUTH_004", "소셜 사용자 정보 조회에 실패했습니다."),
    OAUTH_EMAIL_NOT_VERIFIED(HttpStatus.BAD_REQUEST, "OAUTH_005", "소셜 계정 이메일이 확인되지 않았습니다."),

    // resume
    RESUME_NOT_FOUND(HttpStatus.NOT_FOUND, "RESUME_001", "이력서를 찾을 수 없습니다."),
    RESUME_ACCESS_DENIED(HttpStatus.FORBIDDEN, "RESUME_002", "해당 이력서를 수정할 권한이 없습니다."),
    INVALID_RESUME_DATE_RANGE(HttpStatus.BAD_REQUEST, "RESUME_003", "종료일은 시작일보다 빠를 수 없습니다."),

    // cover-letter
    COVER_LETTER_NOT_FOUND(HttpStatus.NOT_FOUND, "COVER_LETTER_001", "자기소개서를 찾을 수 없습니다."),
    DUPLICATE_COVER_LETTER_CONTENT_ORDER(HttpStatus.BAD_REQUEST, "COVER_LETTER_002", "자기소개서 문항 순서는 중복될 수 없습니다."),

    // AI 모의 면접 관련 에러
    FASTAPI_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "AI_INTERVIEW_001", "AI 질문 생성 중 서버 에러 발생"),
    INTERVIEW_NOT_FOUND(HttpStatus.NOT_FOUND, "AI_INTERVIEW_002", "해당 면접 기록을 찾을 수 없거나 접근 권한이 없습니다."),
    REPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "AI_INTERVIEW_003", "해당 면접의 종합 평가 리포트가 아직 생성되지 않았거나 존재하지 않습니다."),

    //GITHUB 관련 에러
    GITHUB_APP_NOT_FOUND(HttpStatus.NOT_FOUND, "GITHUB_001", "깃허브 연동 정보가 존재하지 않습니다."),
    GITHUB_TOKEN_ISSUE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "GITHUB_002", "깃허브 토큰 발급 중 오류가 발생했습니다."),
    GITHUB_REPO_SYNC_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "GITHUB_003","레포지토리 동기화 중 오류가 발생했습니다."),
    GITHUB_REPO_NOT_FOUND(HttpStatus.NOT_FOUND, "GITHUB_004", "해당 레포지토리를 찾을 수 없거나 권한이 없습니다."),
    GITHUB_ANALYSIS_PARSE_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "GITHUB_005", "GMS 응답에서 JSON 추출을 실패했습니다."),
    GITHUB_PROMPT_LOAD_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "GITHUB_006", "프롬프트 파일 로드에 실패했습니다."),

    // 그룹 스터디 세션 에러
    GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "G001", "해당 그룹을 찾을 수 없습니다."),
    GROUP_ACCESS_DENIED(HttpStatus.FORBIDDEN, "G002", "해당 그룹에 접근할 권한이 없습니다. (멤버가 아님)"),
    UNAUTHORIZED_GROUP_ACTION(HttpStatus.FORBIDDEN, "G003", "방장만 수행할 수 있는 권한입니다."),
    GROUP_FULL_CANNOT_RECRUIT(HttpStatus.BAD_REQUEST, "G004", "이미 정원이 다 차서 모집 중으로 변경할 수 없습니다."),
    NOT_GROUP_MEMBER(HttpStatus.BAD_REQUEST, "G005", "해당 그룹의 멤버가 아닙니다."),
    OWNER_CANNOT_LEAVE_WITH_MEMBERS(HttpStatus.BAD_REQUEST, "G006", "다른 멤버가 존재할 경우 방장은 그룹을 탈퇴할 수 없습니다."),

    // Community (Post, Comment)
    POST_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMUNITY_001", "게시글을 찾을 수 없습니다."),
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMUNITY_002", "댓글을 찾을 수 없습니다."),
    UNAUTHORIZED_POST_ACTION(HttpStatus.FORBIDDEN, "COMMUNITY_003", "해당 게시글에 대한 권한이 없습니다."),
    UNAUTHORIZED_COMMENT_ACTION(HttpStatus.FORBIDDEN, "COMMUNITY_004", "해당 댓글에 대한 권한이 없습니다."),
    ALREADY_LIKED_POST(HttpStatus.CONFLICT, "COMMUNITY_005", "이미 좋아요를 누른 게시글입니다."),
    ALREADY_SCRAPPED_POST(HttpStatus.CONFLICT, "COMMUNITY_006", "이미 스크랩한 게시글입니다."),
    LIKE_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMUNITY_007", "좋아요 내역을 찾을 수 없습니다."),
    SCRAP_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMUNITY_008", "스크랩 내역을 찾을 수 없습니다."),
    COMMENT_ALREADY_DELETED(HttpStatus.BAD_REQUEST, "COMMUNITY_009", "이미 삭제된 댓글입니다."),
    ALREADY_LIKED_COMMENT(HttpStatus.CONFLICT, "COMMUNITY_010", "이미 좋아요를 누른 댓글입니다."),

    // Study Group
    STUDY_GROUP_NOT_FOUND(HttpStatus.NOT_FOUND, "STUDY_GROUP_001", "스터디 그룹을 찾을 수 없습니다."),
    STUDY_GROUP_ACCESS_DENIED(HttpStatus.FORBIDDEN, "STUDY_GROUP_002", "스터디 그룹장만 사용할 수 있는 기능입니다."),
    CANNOT_KICK_SELF(HttpStatus.BAD_REQUEST, "STUDY_GROUP_003", "자기 자신을 추방할 수 없습니다."),
    STUDY_GROUP_CHAT_NOT_FOUND(HttpStatus.NOT_FOUND, "STUDY_GROUP_CHAT_001", "채팅 메시지를 찾을 수 없습니다."),
    STUDY_GROUP_CHAT_SELF_REACTION(HttpStatus.BAD_REQUEST, "STUDY_GROUP_CHAT_002", "자신이 보낸 메시지에는 반응할 수 없습니다."),

    // 그룹 달력
    CALENDAR_NOT_FOUND(HttpStatus.NOT_FOUND, "CALENDAR_001", "해당 일정을 찾을 수 없습니다."),
    INVALID_CALENDAR_GROUP(HttpStatus.FORBIDDEN, "CALENDAR_002", "해당 스터디 그룹의 일정이 아닙니다."),
    INVALID_CALENDAR_TIME(HttpStatus.BAD_REQUEST, "CALENDAR_003", "일정 시작 시간이 종료 시간보다 늦을 수 없습니다."),
    CALENDAR_ACCESS_DENIED(HttpStatus.FORBIDDEN, "CALENDAR_004", "일정을 수정하거나 삭제할 권한이 없습니다."),
    CALENDAR_SCHEDULE_CONFLICT(HttpStatus.CONFLICT, "CALENDAR_005", "해당 시간에 이미 다른 일정이 등록되어 있습니다."),

    // 스터디 가입
    ALREADY_MEMBER_OR_APPLIED(HttpStatus.CONFLICT, "APPLICATION_001", "이미 가입되었거나 가입 신청 대기 중인 상태입니다."),
    NOT_GROUP_OWNER(HttpStatus.FORBIDDEN, "APPLICATION_002", "스터디 그룹의 방장만 접근할 수 있습니다."),
    APPLICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "APPLICATION_003", "해당 가입 신청 내역을 찾을 수 없습니다."),
    INVALID_APPLICATION(HttpStatus.BAD_REQUEST, "APPLICATION_004", "유효하지 않은 가입 신청이거나 이미 처리된 신청입니다."),
    STUDY_GROUP_FULL(HttpStatus.CONFLICT, "GROUP_005", "스터디 그룹의 모집 정원이 마감되었습니다."),
    KICKED_USER_CANNOT_REJOIN(HttpStatus.CONFLICT, "GROUP_006", "강퇴 당한 멤버는 다시 신청할 수 없습니다."),

    // Study Session
    STUDY_SESSION_ALREADY_ACTIVE(HttpStatus.CONFLICT, "STUDY_SESSION_001", "이미 진행 중이거나 대기 중인 화상 스터디 세션이 있습니다."),
    STUDY_SESSION_NOT_FOUND(HttpStatus.NOT_FOUND, "STUDY_SESSION_002", "화상 스터디 세션을 찾을 수 없습니다."),
    STUDY_SESSION_ENDED(HttpStatus.CONFLICT, "STUDY_SESSION_003", "이미 종료된 화상 스터디 세션입니다."),
    STUDY_SESSION_ACCESS_DENIED(HttpStatus.FORBIDDEN, "STUDY_SESSION_004", "해당 스터디 그룹의 멤버가 아닙니다."),
    STUDY_SESSION_PARTICIPANT_KICKED(HttpStatus.FORBIDDEN, "STUDY_SESSION_005", "해당 화상 스터디 세션에서 강퇴된 사용자입니다."),
    STUDY_SESSION_FULL(HttpStatus.CONFLICT, "STUDY_SESSION_006", "화상 스터디 세션의 최대 인원에 도달했습니다."),
    STUDY_SESSION_HOST_REQUIRED(HttpStatus.FORBIDDEN, "STUDY_SESSION_007", "화상 스터디 방장만 사용할 수 있는 기능입니다."),
    STUDY_SESSION_CANNOT_KICK_SELF(HttpStatus.BAD_REQUEST, "STUDY_SESSION_008", "방장은 자신을 강퇴할 수 없습니다."),
    STUDY_SESSION_PARTICIPANT_NOT_FOUND(HttpStatus.NOT_FOUND, "STUDY_SESSION_009", "화상 스터디 참가자를 찾을 수 없습니다."),

    // Livekit
    LIVEKIT_TOKEN_GENERATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "LIVEKIT_002", "화상 스터디 접속 토큰 생성에 실패했습니다."),
    LIVEKIT_WEBHOOK_AUTHENTICATION_FAILED(HttpStatus.UNAUTHORIZED, "LIVEKIT_003", "LiveKit Webhook 인증에 실패했습니다."),
    LIVEKIT_WEBHOOK_INVALID_PARTICIPANT(HttpStatus.BAD_REQUEST, "LIVEKIT_004", "LiveKit 참가자 정보를 확인할 수 없습니다."),

    // PeerFeedback
    PEER_FEEDBACK_NOT_FOUND(HttpStatus.NOT_FOUND, "PEER_FEEDBACK_001", "해당 id의 상호 평가를 찾을 수 없습니다."),
    PEER_FEEDBACK_ACCESS_DENIED(HttpStatus.FORBIDDEN, "PEER_FEEDBACK_002", "해당 평가를 수정할 권한이 없습니다."),

    // email
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "AUTH_EMAIL_001", "이미 가입된 이메일입니다."),
    EMAIL_SEND_FAILED(HttpStatus.INTERNAL_SERVER_ERROR, "AUTH_EMAIL_002", "인증 이메일 발송에 실패했습니다."),
    EMAIL_RESEND_TOO_FAST(HttpStatus.TOO_MANY_REQUESTS, "AUTH_EMAIL_003", "인증번호는 1분 후 다시 요청할 수 있습니다."),
    EMAIL_VERIFICATION_CODE_EXPIRED(HttpStatus.BAD_REQUEST, "AUTH_EMAIL_004", "인증번호가 만료되었거나 존재하지 않습니다."),
    EMAIL_VERIFICATION_CODE_MISMATCH(HttpStatus.BAD_REQUEST, "AUTH_EMAIL_005", "인증번호가 일치하지 않습니다."),
    EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "AUTH_EMAIL_006", "인증번호 입력 횟수를 초과했습니다. 다시 발급해주세요."),
    EMAIL_NOT_VERIFIED(HttpStatus.BAD_REQUEST, "AUTH_EMAIL_007", "이메일 인증이 완료되지 않았습니다."),


    // 상호평가 요약
    STUDY_SESSION_NOT_FINISHED(HttpStatus.CONFLICT, "STUDY_SESSION_010", "종료되지 않은 세션의 상호평가를 요약할 수 없습니다."),
    GMS_REQUEST_FAILED(HttpStatus.BAD_GATEWAY, "GMS_001", "AI 요약 생성 요청에 실패했습니다."),
    GMS_RESPONSE_PARSE_FAILED(HttpStatus.BAD_GATEWAY, "GMS_002", "AI 요약 결과를 처리하지 못했습니다."),
    GMS_RESPONSE_INVALID(HttpStatus.BAD_GATEWAY, "GMS_003", "AI 요약 결과가 올바른 형식이 아닙니다."),


    // user
    GITHUB_REPOSITORY_NOT_FOUND(HttpStatus.NOT_FOUND, "GITHUB_002", "GitHub 레포지토리를 찾을 수 없습니다."),
    INVALID_GITHUB_REPOSITORY(HttpStatus.BAD_REQUEST, "GITHUB_003", "잘못된 GitHub 레포지토리 요청입니다.");


    private final HttpStatus status;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}
