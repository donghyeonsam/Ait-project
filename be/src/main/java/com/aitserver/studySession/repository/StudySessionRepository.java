package com.aitserver.studySession.repository;


import com.aitserver.studySession.entity.StudySession;
import com.aitserver.studySession.domain.StudySessionStatus;
import com.aitserver.studySession.entity.StudySessionParticipant;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
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


    // 세션 종료
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select session
        from StudySession session
        join fetch session.studyGroup studyGroup
        join fetch studyGroup.owner
        where session.id = :sessionId
          and studyGroup.deletedAt is null
        """)
    Optional<StudySession> findForEnd(
            @Param("sessionId")
            Long sessionId
    );

    // 그룹 세션이 활성화 중인지
    Optional<StudySession>
    findFirstByStudyGroupIdAndStatusOrderByCreatedAtDesc(
            Long groupId,
            StudySessionStatus status
    );

}