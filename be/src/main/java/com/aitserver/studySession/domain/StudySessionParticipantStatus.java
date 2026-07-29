package com.aitserver.studySession.domain;


public enum StudySessionParticipantStatus {
    CONNECTING, // 접속 연결중, (DB에는 insert 되었지만 실제 접속은 아직 확인 안됨)
    JOINED,  // 현재 세션에 접속 중
    LEFT,    // 정상 퇴장 또는 연결 종료
    KICKED   // 방장에게 강퇴됨
}