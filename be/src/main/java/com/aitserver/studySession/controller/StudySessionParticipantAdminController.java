package com.aitserver.studySession.controller;


import com.aitserver.studySession.service.StudySessionParticipantAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/study-sessions")
public class StudySessionParticipantAdminController {

    private final StudySessionParticipantAdminService
            participantAdminService;

    @DeleteMapping(
            "/{sessionId}/participants/{targetUserId}"
    )
    public ResponseEntity<Void> kickParticipant(
            @PathVariable
            Long sessionId,

            @PathVariable
            Long targetUserId,

            @AuthenticationPrincipal
            Long userId
    ) {
        participantAdminService.kickParticipant(
                sessionId,
                targetUserId,
                userId
        );

        return ResponseEntity.noContent().build();
    }
}