package com.aitserver.studygroup.dto;

import com.aitserver.studygroup.entity.StudyGroup;
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
    private String status;
    private LocalDateTime createdAt;

    public static StudyGroupListResponseDto from(StudyGroup studyGroup) {
        return StudyGroupListResponseDto.builder()
                .id(studyGroup.getId())
                .title(studyGroup.getTitle())
                .description(studyGroup.getDescription())
                .capacity(studyGroup.getCapacity())
                .status(studyGroup.getStatus())
                .createdAt(studyGroup.getCreatedAt())
                .build();
    }
}