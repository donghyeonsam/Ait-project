package com.aitserver.community.repository;

import com.aitserver.community.entity.PostComment;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, Long> {

    // 1. 부모 댓글(원댓글)만 30개 가져오기
    @EntityGraph(attributePaths = {"user"})
    Slice<PostComment> findByPostIdAndParentIsNullOrderByCreatedAtAsc(Long postId, Pageable pageable);

    // 2. 가져온 부모 댓글들의 ID를 리스트로 넣어서, 달린 답글들을 한 번에 다 가져오기
    @EntityGraph(attributePaths = {"user"})
    List<PostComment> findByParentIdInOrderByCreatedAtAsc(List<Long> parentIds);

    @Query("SELECT c.post.id, COUNT(c.id) " +
            "FROM PostComment c " +
            "WHERE c.post.id IN :postIds AND c.deletedAt IS NULL " +
            "GROUP BY c.post.id")
    List<Object[]> countCommentsByPostIdIn(@Param("postIds") List<Long> postIds);
}