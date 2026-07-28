package com.aitserver.studyGroupRoom.dto;

import com.aitserver.studyGroupRoom.domain.StudyGroupStatus;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.entity.StudyGroupMember;
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
    private StudyGroupStatus groupStatus;

    // StudyGroupMember 엔티티를 받아서 변환
    public static MyStudyGroupResponseDto from(StudyGroupMember member) {
        StudyGroup group = member.getStudyGroup();

        return MyStudyGroupResponseDto.builder()
                .id(group.getId())
                .title(group.getTitle())
                .description(group.getDescription())
                .capacity(StudyGroup.MAX_CAPACITY)
                .currentMemberCount(group.getCurrentMemberCount())
                .groupStatus(group.getStatus())
                .build();
    }
}