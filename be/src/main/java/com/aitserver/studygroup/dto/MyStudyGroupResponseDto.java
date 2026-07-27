package com.aitserver.studygroup.dto;

import com.aitserver.studygroup.entity.StudyGroup;
import com.aitserver.studygroup.entity.StudyGroupMember;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class MyStudyGroupResponseDto {
    private Long id;
    private String title;
    private String description;
    private int capacity;
    private int currentMemberCount;
    private String groupStatus;
    private LocalDateTime joinedAt;

    // StudyGroupMember 엔티티를 받아서 변환
    public static MyStudyGroupResponseDto from(StudyGroupMember member) {
        StudyGroup group = member.getStudyGroup();

        return MyStudyGroupResponseDto.builder()
                .id(group.getId())
                .title(group.getTitle())
                .description(group.getDescription())
                .capacity(group.getCapacity())
                .currentMemberCount(group.getCurrentMemberCount())
                .groupStatus(group.getStatus())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}