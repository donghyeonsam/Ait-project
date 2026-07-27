package com.aitserver.studygroup.repository;

import com.aitserver.studygroup.entity.StudyGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface StudyGroupRepository extends JpaRepository<StudyGroup, Long> {

    @Query("SELECT s FROM StudyGroup s " +
            "WHERE (:status IS NULL OR s.status = :status) " +
            "AND (:keyword IS NULL OR s.title LIKE %:keyword% OR s.description LIKE %:keyword%)")
    Page<StudyGroup> findByCondition(
            @Param("status") String status,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query("SELECT g FROM StudyGroup g JOIN FETCH g.members m WHERE g.id = :groupId")
    Optional<StudyGroup> findByIdWithMembers(@Param("groupId") Long groupId);
}