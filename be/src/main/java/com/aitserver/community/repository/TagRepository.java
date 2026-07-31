package com.aitserver.community.repository;

import com.aitserver.community.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.awt.print.Pageable;
import java.util.List;
import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {

    // 태그명으로 정확히 찾기 (중복 생성 방지용)
    Optional<Tag> findByName(String name);

    // 인기 태그 Top N 조회 (post_tags 테이블과 조인하여 사용량 순으로 정렬)
    // 반환값을 DTO 프로젝션(Object 배열 또는 인터페이스)으로 받을 수 있도록 구성
    @Query("SELECT t.name, COUNT(pt) as usageCount " +
            "FROM Tag t JOIN PostTag pt ON t.id = pt.tag.id " +
            "GROUP BY t.id " +
            "ORDER BY usageCount DESC")
    List<Object[]> findPopularTags(Pageable  pageable);
}