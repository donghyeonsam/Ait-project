package com.aitserver.studyGroupRoom.dto;

import com.aitserver.studyGroupRoom.entity.StudyGroupMember;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ApplicationResponse {
    private Long applicationId;
    private Long userId;

    // ✨ 추가된 필드: 프론트엔드 UI(신청자 목록)를 위한 유저 정보
    private String nickname;
    private String profileImageUrl;

    private String message;
    private LocalDateTime appliedAt;

    public static ApplicationResponse from(StudyGroupMember member) {
        return ApplicationResponse.builder()
                .applicationId(member.getId())
                .userId(member.getUser().getId())

                .nickname(member.getUser().getNickname())
                .profileImageUrl(member.getUser().getProfileImage())

                .message(member.getMessage())
                .appliedAt(member.getCreatedAt())
                .build();
    }
}