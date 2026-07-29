package com.aitserver.studyGroupRoom.repository;


import com.aitserver.studyGroupRoom.domain.StudyGroupStatus;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface StudyGroupRepository
        extends JpaRepository<StudyGroup, Long> {

// =================================================================
    // 1. 커스텀 JPQL 메서드 (본인 코드 기반)
    // =================================================================

    // 검색 및 페이징 (String -> Enum 타입으로 변경)
    @Query("SELECT s FROM StudyGroup s " +
            "WHERE (:status IS NULL OR s.status = :status) " +
            "AND (:keyword IS NULL OR s.title LIKE %:keyword% OR s.description LIKE %:keyword%)")
    Page<StudyGroup> findByCondition(
            @Param("status") StudyGroupStatus status, // Enum 적용
            @Param("keyword") String keyword,
            Pageable pageable
    );

    // 스터디 그룹 단건 조회 + 멤버 목록 한 번에 가져오기 (N+1 방지)
    @Query("SELECT g FROM StudyGroup g JOIN FETCH g.members m WHERE g.id = :groupId")
    Optional<StudyGroup> findByIdWithMembers(@Param("groupId") Long groupId);


    // =================================================================
    // 2. 기본 쿼리 메서드 (팀원 코드 기반 + 중복 조건 제거)
    // =================================================================

    // 방장 정보와 함께 스터디 그룹 단건 조회 (@SQLRestriction 덕분에 AndDeletedAtIsNull 제거)
    // Spring Data JPA는 find...ById 사이의 단어를 무시하므로 네이밍을 직관적으로 수정
    @EntityGraph(attributePaths = "owner")
    Optional<StudyGroup> findGroupWithOwnerById(Long groupId);


    // 세션 생성용 비관적 락 조회 (JPQL 내부의 deleted_at 조건 제거)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select sg
            from StudyGroup sg
            join fetch sg.owner
            where sg.id = :groupId
            """)
    Optional<StudyGroup> findForSessionCreation(@Param("groupId") Long groupId);

    Optional<StudyGroup> findByIdAndDeletedAtIsNull(
            Long groupId
    );
}