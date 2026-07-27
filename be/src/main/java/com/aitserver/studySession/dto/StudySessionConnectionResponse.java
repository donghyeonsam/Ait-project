package com.aitserver.studySession.dto;

import com.aitserver.studySession.domain.StudySessionParticipantRole;

public record StudySessionConnectionResponse(

        Long sessionId,
        Long groupId,

        String roomName,
        String serverUrl,

        String participantToken,
        String participantIdentity,
        String participantName,

        StudySessionParticipantRole role

) {
}