package com.aitserver.studySession.dto;


import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class StudyGroupActiveSessionResponse {

    private boolean hasActiveSession;

    private Long sessionId;

    public static StudyGroupActiveSessionResponse exists(
            Long sessionId
    ) {
        return new StudyGroupActiveSessionResponse(
                true,
                sessionId
        );
    }

    public static StudyGroupActiveSessionResponse notExists() {
        return new StudyGroupActiveSessionResponse(
                false,
                null
        );
    }
}