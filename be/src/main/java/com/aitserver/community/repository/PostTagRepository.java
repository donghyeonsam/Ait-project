package com.aitserver.community.repository;

import com.aitserver.community.entity.PostTag;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PostTagRepository extends JpaRepository<PostTag, Long> {

    // 게시글에 달린 태그 목록 조회 (Tag 엔티티 즉시 로딩)
    @EntityGraph(attributePaths = {"tag"})
    List<PostTag> findByPostId(Long postId);

    // 게시글 수정 시 기존 태그 싹 지우기 (벌크 연산으로 성능 최적화)
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM PostTag pt WHERE pt.post.id = :postId")
    void deleteAllByPostId(@Param("postId") Long postId);
}