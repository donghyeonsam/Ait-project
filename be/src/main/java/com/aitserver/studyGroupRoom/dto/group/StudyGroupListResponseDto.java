package com.aitserver.studyGroupRoom.dto.group;

import com.aitserver.studyGroupRoom.domain.StudyGroupStatus;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class StudyGroupListResponseDto {
    private Long id;
    private String title;
    private String description;
    private String ownerProfileImage;
    private int capacity;
    private StudyGroupStatus groupStatus;
    private LocalDateTime createdAt;
    private int currentMemberCount;
    private boolean isPending;

    public static StudyGroupListResponseDto of(StudyGroup studyGroup, boolean isPending) {
        return StudyGroupListResponseDto.builder()
                .id(studyGroup.getId())
                .title(studyGroup.getTitle())
                .description(studyGroup.getDescription())
                .capacity(StudyGroup.MAX_CAPACITY)
                .currentMemberCount(studyGroup.getCurrentMemberCount())
                .groupStatus(studyGroup.getStatus())
                .createdAt(studyGroup.getCreatedAt())
                .ownerProfileImage(studyGroup.getOwner().getProfileImage())
                .isPending(isPending)
                .build();
    }
}