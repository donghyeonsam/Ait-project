package com.aitserver.community.repository;

import com.aitserver.community.entity.PostLikeScrap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PostLikeScrapRepository extends JpaRepository<PostLikeScrap, Long> {

    // 이미 좋아요/스크랩을 했는지 확인 (중복 방지용)
    boolean existsByPostIdAndUserIdAndType(Long postId, Long userId, PostLikeScrap.ActionType type);

    // 좋아요/스크랩 취소 시 해당 데이터를 찾기 위해 사용
    Optional<PostLikeScrap> findByPostIdAndUserIdAndType(Long postId, Long userId, PostLikeScrap.ActionType type);
}