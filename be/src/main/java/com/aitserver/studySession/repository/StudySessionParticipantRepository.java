package com.aitserver.studySession.repository;


import com.aitserver.studySession.entity.StudySessionParticipant;
import com.aitserver.studySession.domain.StudySessionParticipantStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudySessionParticipantRepository
        extends JpaRepository<StudySessionParticipant, Long> {

    Optional<StudySessionParticipant>
    findByStudySessionIdAndUserId(
            Long sessionId,
            Long userId
    );

    boolean existsByStudySessionIdAndUserIdAndStatus(
            Long sessionId,
            Long userId,
            StudySessionParticipantStatus status
    );

    long countByStudySessionIdAndStatus(
            Long sessionId,
            StudySessionParticipantStatus status
    );

    @EntityGraph(attributePaths = "user")
    List<StudySessionParticipant>
    findAllByStudySessionIdOrderByFirstJoinedAtAsc(
            Long sessionId
    );

    List<StudySessionParticipant>
    findAllByStudySessionIdAndStatus(
            Long sessionId,
            StudySessionParticipantStatus status
    );
}