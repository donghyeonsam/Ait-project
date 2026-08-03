package com.aitserver.user.repository; // 프로젝트의 user 패키지 경로

import com.aitserver.user.entity.UserSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserSkillRepository extends JpaRepository<UserSkill, Long> {

    /**
     * 1. userId 기반으로 사용자 스킬 이름(String) 리스트만 직접 추출
     * 예: ["Java", "Spring Boot", "MySQL"]
     */
    @Query("SELECT us.skill FROM UserSkill us WHERE us.userId = :userId")
    List<String> findSkillsByUserId(@Param("userId") Long userId);

    /**
     * 2. 엔티티 자체 목록이 필요한 경우
     */
    List<UserSkill> findByUserId(Long userId);


    List<UserSkill> findAllByUserIdOrderByIdAsc(Long userId);

    // UserSkill의 userId 필드를 기준으로 전체 삭제
    void deleteAllByUserId(Long userId);
}