package com.aitserver.global.livekit;



import com.aitserver.studySession.domain.StudySessionParticipantRole;

public record LiveKitParticipantMetadata(

        Long sessionId,
        Long userId,
        StudySessionParticipantRole role

) {
}