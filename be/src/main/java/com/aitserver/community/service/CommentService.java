package com.aitserver.community.service;

import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import com.aitserver.community.dto.CommentDto;
import com.aitserver.community.entity.CommentLike;
import com.aitserver.community.entity.Post;
import com.aitserver.community.entity.PostComment;
import com.aitserver.community.repository.CommentLikeRepository;
import com.aitserver.community.repository.PostCommentRepository;
import com.aitserver.community.repository.PostRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService {

    private final PostCommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final CommentLikeRepository commentLikeRepository;

    /**
     * 1. 댓글 / 답글 작성
     */
    @Transactional
    public Long createComment(Long userId, Long postId, CommentDto.CreateRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        PostComment parent = null;
        if (request.getParentId() != null) {
            parent = commentRepository.findById(request.getParentId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.COMMENT_NOT_FOUND));

            // 엔티티 내부 객체지향적 검증 로직 호출 (답글의 답글 방지)
            parent.validateCanHaveReply();
        }

        PostComment comment = PostComment.builder()
                .post(post)
                .user(user)
                .parent(parent)
                .content(request.getContent())
                .build();

        return commentRepository.save(comment).getId();
    }

    /**
     * 2. 게시글 댓글 목록 조회 (1-Depth 트리 조립 및 삭제 필터링)
     */
    public List<CommentDto.Response> getComments(Long userId, Long postId) {
        // 생성일자 오름차순으로 전체 댓글 평면(Flat) 조회
        List<PostComment> comments = commentRepository.findByPostIdOrderByCreatedAtAsc(postId);

        // N+1 방지: 현재 사용자가 좋아요를 누른 댓글 ID 목록 추출 (로그인 시에만)
        Set<Long> likedCommentIds = new HashSet<>();
        if (userId != null) {
            List<CommentLike> userLikes = commentLikeRepository.findByUserIdAndCommentIdIn(
                    userId,
                    comments.stream().map(PostComment::getId).collect(Collectors.toList())
            );
            likedCommentIds = userLikes.stream()
                    .map(like -> like.getComment().getId())
                    .collect(Collectors.toSet());
        }

        Map<Long, CommentDto.Response> responseMap = new HashMap<>();
        List<CommentDto.Response> result = new ArrayList<>();

        for (PostComment comment : comments) {
            boolean isDeleted = comment.getDeletedAt() != null;

            // 필터링 1: 삭제된 '답글'은 껍데기도 남길 필요가 없으므로 아예 건너뜀
            if (comment.isReply() && isDeleted) {
                continue;
            }

            boolean isLiked = likedCommentIds.contains(comment.getId());
            CommentDto.Response dto = CommentDto.Response.of(comment, isLiked);
            responseMap.put(dto.getId(), dto);

            if (comment.isReply()) {
                // 부모 DTO를 찾아서 replies에 추가
                CommentDto.Response parentDto = responseMap.get(comment.getParent().getId());
                if (parentDto != null) {
                    parentDto.getReplies().add(dto);
                }
            } else {
                // 원댓글은 결과 리스트에 추가
                result.add(dto);
            }
        }

        // 자식(답글)이 하나도 없는 '삭제된 원댓글'을 화면에서 제거
        result.removeIf(dto -> dto.getDeletedAt() != null && dto.getReplies().isEmpty());

        return result;
    }

    /**
     * 3. 댓글 수정
     */
    @Transactional
    public void updateComment(Long userId, Long commentId, CommentDto.UpdateRequest request) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_COMMENT_ACTION);
        }
        if (comment.getDeletedAt() != null) {
            throw new BusinessException(ErrorCode.COMMENT_ALREADY_DELETED);
        }

        comment.updateContent(request.getContent());
    }

    /**
     * 4. 댓글 삭제 (Soft Delete)
     */
    @Transactional
    public void deleteComment(Long userId, Long commentId) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMENT_NOT_FOUND));

        if (!comment.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_COMMENT_ACTION);
        }
        if (comment.getDeletedAt() != null) {
            throw new BusinessException(ErrorCode.COMMENT_ALREADY_DELETED);
        }

        comment.softDelete();
    }

    /**
     * 5. 댓글 좋아요 등록
     */
    @Transactional
    public void addLike(Long userId, Long commentId) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMENT_NOT_FOUND));

        // 삭제된 댓글에는 좋아요 불가
        if (comment.getDeletedAt() != null) {
            throw new BusinessException(ErrorCode.COMMENT_ALREADY_DELETED);
        }

        // 중복 좋아요 방지
        if (commentLikeRepository.existsByUserIdAndCommentId(userId, commentId)) {
            throw new BusinessException(ErrorCode.ALREADY_LIKED_COMMENT);
        }

        User user = userRepository.getReferenceById(userId);

        // 좋아요 엔티티 저장
        commentLikeRepository.save(CommentLike.builder()
                .comment(comment)
                .user(user)
                .build());

        // 댓글 엔티티의 좋아요 수 증가 (Dirty Checking)
        comment.increaseLikeCount();
    }

    /**
     * 6. 댓글 좋아요 취소
     */
    @Transactional
    public void removeLike(Long userId, Long commentId) {
        PostComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMENT_NOT_FOUND));

        CommentLike commentLike = commentLikeRepository.findByUserIdAndCommentId(userId, commentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LIKE_NOT_FOUND));

        // 좋아요 엔티티 삭제
        commentLikeRepository.delete(commentLike);

        // 댓글 엔티티의 좋아요 수 감소 (Dirty Checking)
        comment.decreaseLikeCount();
    }
}