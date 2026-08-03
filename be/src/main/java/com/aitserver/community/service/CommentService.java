package com.aitserver.community.service;

import com.aitserver.user.entity.User;
import com.aitserver.user.repository.UserRepository;
import com.aitserver.community.dto.CommentDto;
import com.aitserver.community.entity.CommentLike;
import com.aitserver.community.entity.Post;
import com.aitserver.community.entity.PostComment;
import com.aitserver.community.repository.CommentLikeRepository;
import com.aitserver.community.repository.PostCommentRepository;
import com.aitserver.community.repository.PostRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.notification.entity.NotificationType;
import com.aitserver.notification.event.NotificationEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
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
    private final ApplicationEventPublisher eventPublisher;

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

        PostComment savedComment = commentRepository.save(comment);

        if(!post.getUser().getId().equals(userId)) {
            eventPublisher.publishEvent(new NotificationEvent(
                    post.getUser().getId(),
                    NotificationType.COMMENT,
                    post.getId(),
                    "회원님의 게시글에 새로운 댓글이 달렸습니다."
            ));
        }

        return savedComment.getId();
    }

    /**
     * 2. 게시글 댓글 목록 조회
     */
    public CommentDto.ScrollResponse getComments(Long userId, Long postId, Pageable pageable) {

        // 1. 원댓글만 30개 Slice로 가져오기
        Slice<PostComment> parentSlice = commentRepository.findByPostIdAndParentIsNullOrderByCreatedAtAsc(postId, pageable);
        List<PostComment> parentComments = parentSlice.getContent();

        if (parentComments.isEmpty()) {
            return new CommentDto.ScrollResponse(Collections.emptyList(), false);
        }

        // 2. 원댓글 ID 추출
        List<Long> parentIds = parentComments.stream()
                .map(PostComment::getId)
                .toList();

        // 3. 이 원댓글들에 달린 모든 답글을 한 번의 쿼리로 싹 가져오기 (N+1 방지)
        List<PostComment> replies = commentRepository.findByParentIdInOrderByCreatedAtAsc(parentIds);

        // 4. 가져온 답글들을 "부모 ID"를 기준으로 그룹화 해두기 (Map 형태)
        Map<Long, List<PostComment>> replyMap = replies.stream()
                .collect(Collectors.groupingBy(reply -> reply.getParent().getId()));

        // 5. 좋아요 여부 확인용 로직 (원댓글 + 답글 ID 합쳐서 한 번에 조회)
        Set<Long> likedCommentIds = new HashSet<>();
        if (userId != null) {
            List<Long> allIds = new ArrayList<>(parentIds);
            allIds.addAll(replies.stream().map(PostComment::getId).toList());

            likedCommentIds = commentLikeRepository.findByUserIdAndCommentIdIn(userId, allIds).stream()
                    .map(like -> like.getComment().getId())
                    .collect(Collectors.toSet());
        }

        // dto 조립
        List<CommentDto.Response> result = new ArrayList<>();

        for (PostComment parent : parentComments) {
            boolean isParentLiked = likedCommentIds.contains(parent.getId());
            CommentDto.Response parentDto = CommentDto.Response.of(parent, isParentLiked);

            // Map에서 이 부모의 답글 리스트를 꺼냄 (없으면 빈 리스트)
            List<PostComment> childComments = replyMap.getOrDefault(parent.getId(), Collections.emptyList());

            // 부모 DTO의 replies 리스트에 답글 DTO들을 변환해서 넣음
            for (PostComment child : childComments) {
                if (child.getDeletedAt() != null) continue; // 삭제된 답글은 프론트로 안 보냄

                boolean isChildLiked = likedCommentIds.contains(child.getId());
                parentDto.getReplies().add(CommentDto.Response.of(child, isChildLiked));
            }

            if (parent.getDeletedAt() != null && parentDto.getReplies().isEmpty()) {
                continue;
            }

            result.add(parentDto);
        }

        // 7. 반환! 프론트엔드는 이제 result 안에 쏙쏙 박혀있는 replies를 렌더링하면 됨
        return new CommentDto.ScrollResponse(result, parentSlice.hasNext());
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