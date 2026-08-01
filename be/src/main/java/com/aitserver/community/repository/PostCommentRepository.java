package com.aitserver.community.repository;

import com.aitserver.community.entity.PostComment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, Long> {

    // 특정 게시글의 모든 댓글 조회 (작성자 정보 포함)
    @EntityGraph(attributePaths = {"user"})
    List<PostComment> findByPostIdOrderByCreatedAtAsc(Long postId);

    @Query("SELECT c.post.id, COUNT(c.id) " +
            "FROM PostComment c " +
            "WHERE c.post.id IN :postIds AND c.deletedAt IS NULL " +
            "GROUP BY c.post.id")
    List<Object[]> countCommentsByPostIdIn(@Param("postIds") List<Long> postIds);
}