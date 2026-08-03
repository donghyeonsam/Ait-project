package com.aitserver.studySession.dto;


import com.aitserver.studySession.domain.StudySessionStatus;
import com.aitserver.studySession.entity.StudySession;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class StudySessionStatusResponse {

    private Long sessionId;

    private StudySessionStatus status;

    private boolean ended;

    private LocalDateTime endedAt;

    public static StudySessionStatusResponse from(
            StudySession studySession
    ) {
        return StudySessionStatusResponse.builder()
                .sessionId(studySession.getId())
                .status(studySession.getStatus())
                .ended(studySession.isEnded())
                .endedAt(studySession.getEndedAt())
                .build();
    }
}