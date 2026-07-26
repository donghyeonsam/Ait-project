package com.aitserver.studygroup.repository;

import com.aitserver.studygroup.entity.StudyGroupMember;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StudyGroupMemberRepository extends JpaRepository<StudyGroupMember, Long> {

    // 1. 내가 가입(승인)된 '모든' 스터디 그룹 조회 (최신 가입순)
    @Query("SELECT m FROM StudyGroupMember m " +
            "JOIN FETCH m.studyGroup " +
            "WHERE m.userId = :userId AND m.status = :memberStatus " +
            "ORDER BY m.joinedAt DESC")
    List<StudyGroupMember> findAllMyStudyGroups(
            @Param("userId") Long userId,
            @Param("memberStatus") String memberStatus
    );

    // 2. 내가 가입되어 있으면서, 스터디 그룹이 '종료(completed)'되지 않은 스터디 그룹 조회
    @Query("SELECT m FROM StudyGroupMember m " +
            "JOIN FETCH m.studyGroup g " +
            "WHERE m.userId = :userId " +
            "AND m.status = :memberStatus " +
            "AND g.status != :excludedGroupStatus " +
            "ORDER BY m.joinedAt DESC")
    List<StudyGroupMember> findActiveMyStudyGroups(
            @Param("userId") Long userId,
            @Param("memberStatus") String memberStatus,
            @Param("excludedGroupStatus") String excludedGroupStatus
    );
}