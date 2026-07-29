package com.aitserver.studyGroupRoom.dto.group;

import com.aitserver.studyGroupRoom.domain.StudyGroupStatus;
import lombok.*;

public class StudyGroupRequestDto {

    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class Create {
        private String title;
        private String description;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class UpdateStatus {
        private StudyGroupStatus status;
    }
}