package com.aitserver.studyGroupRoom.dto;

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
    private int capacity;
    private StudyGroupStatus groupStatus;
    private LocalDateTime createdAt;

    public static StudyGroupListResponseDto from(StudyGroup studyGroup) {
        return StudyGroupListResponseDto.builder()
                .id(studyGroup.getId())
                .title(studyGroup.getTitle())
                .description(studyGroup.getDescription())
                .capacity(StudyGroup.MAX_CAPACITY)
                .groupStatus(studyGroup.getStatus())
                .createdAt(studyGroup.getCreatedAt())
                .build();
    }
}