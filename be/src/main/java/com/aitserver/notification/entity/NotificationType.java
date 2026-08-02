package com.aitserver.notification.entity;

public enum NotificationType {
    COMMENT,         // 게시글에 댓글 달림
    LIKE,            // 내 글/댓글에 좋아요
    GROUP_APPLY,     // 그룹 신청 들어옴 (팀장용)
    GROUP_APPROVE,   // 그룹 신청 승인됨 (신청자용)
    GROUP_REJECT,     // 그룹 신청 거절됨 (신청자용)
    GROUP_KICKED    //강퇴당함
}