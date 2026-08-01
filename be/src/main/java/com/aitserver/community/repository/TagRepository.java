package com.aitserver.community.repository;

import com.aitserver.community.entity.Tag;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {

    // 태그명으로 정확히 찾기 (중복 생성 방지용)
    Optional<Tag> findByName(String name);

    // 2. 인기 태그 Top N 조회 (최근 7일 기준)
    @Query("SELECT t.name " +
            "FROM PostTag pt " +
            "JOIN pt.tag t " +
            "JOIN pt.post p " + // 게시글 작성 시간을 확인하기 위한 조인
            "WHERE p.createdAt >= :startDate " +
            "GROUP BY t.id, t.name " +
            "ORDER BY COUNT(pt.id) DESC")
    List<String> findTrendingTagNames(@Param("startDate") LocalDateTime startDate, Pageable pageable);
}