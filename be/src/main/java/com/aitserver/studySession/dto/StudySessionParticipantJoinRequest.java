package com.aitserver.studySession.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record StudySessionParticipantJoinRequest(

        @NotNull
        @Positive
        Long resumeId,

        @NotNull
        @Positive
        Long coverLetterId

) {
}