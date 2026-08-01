package com.aitserver.community.repository;

import com.aitserver.community.entity.CommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {

    // - 특정 사용자가 '주어진 댓글 ID 목록(commentIds)' 중 좋아요를 누른 내역을 한 번에 일괄 조회
    List<CommentLike> findByUserIdAndCommentIdIn(Long userId, List<Long> commentIds);

    // 2. 단일 좋아요 여부 확인 (Service의 addLike 구현 시 중복 방지용)
    boolean existsByUserIdAndCommentId(Long userId, Long commentId);

    // 3. 단일 좋아요 내역 조회 (Service의 removeLike 구현 시 삭제용)
    Optional<CommentLike> findByUserIdAndCommentId(Long userId, Long commentId);
}