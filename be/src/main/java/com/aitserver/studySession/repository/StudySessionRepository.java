package com.aitserver.studySession.repository;


import com.aitserver.studySession.entity.StudySession;
import com.aitserver.studySession.domain.StudySessionStatus;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.Optional;

public interface StudySessionRepository
        extends JpaRepository<StudySession, Long> {

    Optional<StudySession> findByLiveKitRoomName(
            String liveKitRoomName
    );

    boolean existsByStudyGroupIdAndStatusIn(
            Long groupId,
            Collection<StudySessionStatus> statuses
    );

    @EntityGraph(attributePaths = "studyGroup")
    Optional<StudySession> findWithStudyGroupById(
            Long sessionId
    );

    Optional<StudySession>
    findFirstByStudyGroupIdAndStatusInOrderByCreatedAtDesc(
            Long groupId,
            Collection<StudySessionStatus> statuses
    );

    @Query("""
            select ss
            from StudySession ss
            join fetch ss.studyGroup sg
            join fetch sg.owner
            where ss.id = :sessionId
              and sg.deletedAt is null
            """)
    Optional<StudySession> findForConnection(
            @Param("sessionId") Long sessionId
    );

    @Query("""
        select ss
        from StudySession ss
        join fetch ss.studyGroup sg
        join fetch sg.owner
        where ss.liveKitRoomName = :roomName
        """)
    Optional<StudySession> findForWebhookByRoomName(
            @Param("roomName") String roomName
    );
}