package com.aitserver.studyGroupRoom.domain;


public enum StudyGroupMemberStatus {

    ACTIVE,  // 정상 그룹원
    LEFT,    // 그룹 탈퇴
    KICKED,   // 그룹에서 강퇴
    PENDING // 가입 대기
}