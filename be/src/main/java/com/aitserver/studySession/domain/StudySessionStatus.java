package com.aitserver.studySession.domain;


public enum StudySessionStatus {

    WAITING,      // 세션 생성 후 실제 참가자 입장 전
    IN_PROGRESS,  // 한 명 이상 실제로 입장한 상태
    ENDED         // 방장이 종료한 상태
}