package com.aitserver.studySession.repository;


import com.aitserver.studySession.entity.StudySessionParticipant;
import com.aitserver.studySession.domain.StudySessionParticipantStatus;
import io.lettuce.core.dynamic.annotation.Param;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select participant
            from StudySessionParticipant participant
            join fetch participant.studySession session
            join fetch session.studyGroup studyGroup
            join fetch studyGroup.owner
            join fetch participant.user
            where session.id = :sessionId
              and participant.user.id = :targetUserId
            """)
    Optional<StudySessionParticipant> findForKick(
            @Param("sessionId")
            Long sessionId,

            @Param("targetUserId")
            Long targetUserId
    );


    // 세션 참여자 리스트 반환용
    @EntityGraph(attributePaths = "user")
    List<StudySessionParticipant>
    findAllByStudySessionIdAndStatusOrderByFirstJoinedAtAsc(
            Long sessionId,
            StudySessionParticipantStatus status
    );



    List<StudySessionParticipant>
    findAllByStudySessionId(
            Long sessionId
    );


    boolean existsByStudySessionIdAndUserId(
            Long sessionId,
            Long userId
    );
}