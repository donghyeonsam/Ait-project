package com.aitserver.community.repository;

import com.aitserver.community.entity.CommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {

    // 댓글 좋아요 중복 방지 검증
    boolean existsByCommentIdAndUserId(Long commentId, Long userId);

    // 댓글 좋아요 취소 시 사용
    Optional<CommentLike> findByCommentIdAndUserId(Long commentId, Long userId);
}