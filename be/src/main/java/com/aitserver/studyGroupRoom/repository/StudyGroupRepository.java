package com.aitserver.studyGroupRoom.repository;


import com.aitserver.studyGroupRoom.entity.StudyGroup;
import io.lettuce.core.dynamic.annotation.Param;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface StudyGroupRepository
        extends JpaRepository<StudyGroup, Long> {

    @EntityGraph(attributePaths = "owner")
    Optional<StudyGroup> findByIdAndDeletedAtIsNull(
            Long groupId
    );

    boolean existsByIdAndOwnerIdAndDeletedAtIsNull(
            Long groupId,
            Long ownerId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select sg
            from StudyGroup sg
            join fetch sg.owner
            where sg.id = :groupId
              and sg.deletedAt is null
            """)
    Optional<StudyGroup> findForSessionCreation(
            @Param("groupId") Long groupId
    );
}