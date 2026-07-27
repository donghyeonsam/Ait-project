package com.aitserver.studySession.domain;


public enum StudySessionParticipantStatus {

    JOINED,  // 현재 세션에 접속 중
    LEFT,    // 정상 퇴장 또는 연결 종료
    KICKED   // 방장에게 강퇴됨
}