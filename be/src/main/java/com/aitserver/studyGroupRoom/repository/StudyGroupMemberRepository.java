package com.aitserver.studyGroupRoom.repository;


import com.aitserver.studyGroupRoom.domain.StudyGroupMemberStatus;
import com.aitserver.studyGroupRoom.domain.StudyGroupStatus;
import com.aitserver.studyGroupRoom.entity.StudyGroupMember;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StudyGroupMemberRepository
        extends JpaRepository<StudyGroupMember, Long> {

// =================================================================
    // 1. 커스텀 JPQL 메서드 (본인 코드 기반 + Enum 타입 적용)
    // =================================================================

    // 내가 가입(ACTIVE)된 '모든' 스터디 그룹 조회 (최신 가입순)
    @Query("SELECT m FROM StudyGroupMember m " +
            "JOIN FETCH m.studyGroup " +
            "WHERE m.user.id = :userId AND m.status = :memberStatus " +
            "ORDER BY m.updatedAt DESC")
    List<StudyGroupMember> findAllMyStudyGroups(
            @Param("userId") Long userId,
            @Param("memberStatus") StudyGroupMemberStatus memberStatus
    );

    // 내가 가입되어 있으면서, 스터디 그룹이 '종료(CLOSED)'되지 않은 스터디 그룹 조회
    @Query("SELECT m FROM StudyGroupMember m " +
            "JOIN FETCH m.studyGroup g " +
            "WHERE m.user.id = :userId " +
            "AND m.status = :memberStatus " +
            "AND g.status != :excludedGroupStatus " +
            "ORDER BY m.updatedAt DESC")
    List<StudyGroupMember> findActiveMyStudyGroups(
            @Param("userId") Long userId,
            @Param("memberStatus") StudyGroupMemberStatus memberStatus,
            @Param("excludedGroupStatus") StudyGroupStatus excludedGroupStatus
    );


    // =================================================================
    // 2. 기본 쿼리 메서드 (팀원 코드 기반 + N+1 방지 + 중복 조건 제거)
    // =================================================================

    // 특정 그룹과 유저로 멤버 단건 조회 (팀원의 @EntityGraph 적용)
    @EntityGraph(attributePaths = {"studyGroup", "user"})
    Optional<StudyGroupMember> findByStudyGroupIdAndUserId(Long groupId, Long userId);

    // 특정 그룹, 유저, 상태로 존재 여부 확인 (@SQLRestriction이 있으므로 AndDeletedAtIsNull 제거)
    boolean existsByStudyGroupIdAndUserIdAndStatus(
            Long groupId,
            Long userId,
            StudyGroupMemberStatus status
    );

    // 1. 이미 가입했거나 신청 중인지 확인
    boolean existsByStudyGroupIdAndUserId(Long groupId, Long userId);

    // 2. 특정 그룹의 PENDING인 멤버 목록 조회
    List<StudyGroupMember> findByStudyGroupIdAndStatus(Long groupId, StudyGroupMemberStatus status);

    boolean existsByStudyGroupIdAndUserIdAndStatusAndDeletedAtIsNull(
            Long groupId,
            Long userId,
            StudyGroupMemberStatus status
    );

    @Query(value = "SELECT * FROM study_group_members WHERE group_id = :groupId AND user_id = :userId", nativeQuery = true)
    Optional<StudyGroupMember> findByGroupAndUserIncludeDeleted(@Param("groupId") Long groupId, @Param("userId") Long userId);
}
