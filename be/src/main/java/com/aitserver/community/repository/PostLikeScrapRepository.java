package com.aitserver.community.repository;

import com.aitserver.community.entity.Post;
import com.aitserver.community.entity.PostLikeScrap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PostLikeScrapRepository extends JpaRepository<PostLikeScrap, Long> {

    // 이미 좋아요/스크랩을 했는지 확인 (중복 방지용)
    boolean existsByPostIdAndUserIdAndType(Long postId, Long userId, PostLikeScrap.ActionType type);

    // 좋아요/스크랩 취소 시 해당 데이터를 찾기 위해 사용
    Optional<PostLikeScrap> findByPostIdAndUserIdAndType(Long postId, Long userId, PostLikeScrap.ActionType type);

    // 특정 유저가 '여러 게시글(IN)'에 대해 남긴 액션(좋아요/스크랩)을 한 번에 조회
    List<PostLikeScrap> findByUserIdAndPostIdIn(Long userId, List<Long> postIds);


    @Query(
            value = """
                SELECT p
                FROM Post p, PostLikeScrap pls
                WHERE p.id = pls.post.id
                  AND pls.user.id = :userId
                  AND pls.type = :type
                ORDER BY pls.createdAt DESC
                """,
            countQuery = """
                SELECT COUNT(pls)
                FROM PostLikeScrap pls
                WHERE pls.user.id = :userId
                  AND pls.type = :type
                """
    )
    Page<Post> findAllByUserAction(
            @Param("userId") Long userId,
            @Param("type") PostLikeScrap.ActionType type,
            Pageable pageable
    );
}