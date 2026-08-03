package com.aitserver.community.service;

import com.aitserver.user.entity.User;
import com.aitserver.user.repository.UserRepository;
import com.aitserver.community.entity.Post;
import com.aitserver.community.entity.PostLikeScrap;
import com.aitserver.community.entity.PostLikeScrap.ActionType;
import com.aitserver.community.repository.PostLikeScrapRepository;
import com.aitserver.community.repository.PostRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.notification.entity.NotificationType;
import com.aitserver.notification.event.NotificationEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PostInteractionService {

    private final PostLikeScrapRepository postLikeScrapRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 1. 좋아요 등록
     */
    @Transactional
    public void addLike(Long userId, Long postId) {
        addAction(userId, postId, ActionType.LIKE, ErrorCode.ALREADY_LIKED_POST);
    }

    /**
     * 2. 좋아요 취소
     */
    @Transactional
    public void removeLike(Long userId, Long postId) {
        removeAction(userId, postId, ActionType.LIKE, ErrorCode.LIKE_NOT_FOUND);
    }

    /**
     * 3. 스크랩 등록
     */
    @Transactional
    public void addScrap(Long userId, Long postId) {
        addAction(userId, postId, ActionType.SCRAP, ErrorCode.ALREADY_SCRAPPED_POST);
    }

    /**
     * 4. 스크랩 취소
     */
    @Transactional
    public void removeScrap(Long userId, Long postId) {
        removeAction(userId, postId, ActionType.SCRAP, ErrorCode.SCRAP_NOT_FOUND);
    }

    // ==========================================
    // 내부 공통 로직 (좋아요/스크랩 통합 처리)
    // ==========================================

    private void addAction(Long userId, Long postId, ActionType type, ErrorCode duplicateError) {
        // 중복 방지 (ALREADY_LIKED_POST 또는 ALREADY_SCRAPPED_POST)
        if (postLikeScrapRepository.existsByPostIdAndUserIdAndType(postId, userId, type)) {
            throw new BusinessException(duplicateError);
        }

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));

        // User는 DB 조회 없이 ID만 가진 프록시 객체 생성 (성능 최적화)
        User user = userRepository.getReferenceById(userId);

        PostLikeScrap interaction = PostLikeScrap.builder()
                .post(post)
                .user(user)
                .type(type)
                .build();

        postLikeScrapRepository.save(interaction);

        if (type == ActionType.LIKE) {
            post.increaseLikeCount();

            // 내 글에 내가 좋아요를 누른 게 아닐 때만 알림 발생
            if (!post.getUser().getId().equals(userId)) {
                eventPublisher.publishEvent(new NotificationEvent(
                        post.getUser().getId(),
                        NotificationType.LIKE,
                        post.getId(),
                        "[" + post.getTitle() + "] 게시글의 회원님 댓글에 새로운 좋아요가 달렸습니다."
                ));
            }
        }
    }

    private void removeAction(Long userId, Long postId, ActionType type, ErrorCode notFoundError) {
        // 존재하지 않을 경우 (LIKE_NOT_FOUND 또는 SCRAP_NOT_FOUND)
        PostLikeScrap interaction = postLikeScrapRepository.findByPostIdAndUserIdAndType(postId, userId, type)
                .orElseThrow(() -> new BusinessException(notFoundError));

        postLikeScrapRepository.delete(interaction);

         if (type == ActionType.LIKE) interaction.getPost().decreaseLikeCount();
    }
}