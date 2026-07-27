package com.aitserver.studySession.dto;

import com.aitserver.studySession.entity.StudySession;
import com.aitserver.studySession.domain.StudySessionStatus;

import java.time.LocalDateTime;

public record StudySessionCreateResponse(
        Long sessionId,
        Long groupId,
        String liveKitRoomName,
        StudySessionStatus status,
        Integer maxParticipants,
        LocalDateTime createdAt
) {

    public static StudySessionCreateResponse from(
            StudySession studySession
    ) {
        return new StudySessionCreateResponse(
                studySession.getId(),
                studySession.getStudyGroup().getId(),
                studySession.getLiveKitRoomName(),
                studySession.getStatus(),
                studySession.getMaxParticipants(),
                studySession.getCreatedAt()
        );
    }
}