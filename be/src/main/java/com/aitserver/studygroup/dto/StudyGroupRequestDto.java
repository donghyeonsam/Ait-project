package com.aitserver.studygroup.dto;

import lombok.*;

public class StudyGroupRequestDto {

    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class Create {
        private String title;
        private String description;
        private int capacity;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class UpdateStatus {
        private String status;
    }
}