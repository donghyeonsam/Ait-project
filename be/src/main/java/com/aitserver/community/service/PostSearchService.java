package com.aitserver.community.service;

import com.aitserver.community.dto.PostDto;
import com.aitserver.community.entity.Post;
import com.aitserver.community.entity.PostFile;
import com.aitserver.community.entity.PostLikeScrap;
import com.aitserver.community.entity.PostTag;
import com.aitserver.community.repository.PostFileRepository;
import com.aitserver.community.repository.PostLikeScrapRepository;
import com.aitserver.community.repository.PostRepository;
import com.aitserver.community.repository.PostTagRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

import static com.aitserver.auth.entity.QUser.user;
import static com.aitserver.community.entity.QPost.post;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostSearchService {

    private final JPAQueryFactory queryFactory;
    private final PostRepository postRepository;
    private final PostTagRepository postTagRepository;
    private final PostLikeScrapRepository postLikeScrapRepository;
    private final PostFileRepository postFileRepository;

    /**
     * 게시글 목록 조회 (검색 + 정렬 + 페이징 + N+1 최적화)
     */
    public Page<PostDto.ListResponse> getPosts(Long userId, PostDto.SearchCondition condition, Pageable pageable) {

        List<Post> posts = queryFactory
                .selectFrom(post)
                .join(post.user, user).fetchJoin() // 작성자 닉네임 한 번에 조인
                .where(
                        categoryEq(condition.getCategory()),
                        keywordContains(condition.getKeyword())
                )
                .orderBy(createOrderSpecifier(condition.getSortType()))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(post.count())
                .from(post)
                .where(
                        categoryEq(condition.getCategory()),
                        keywordContains(condition.getKeyword())
                );

        Page<Post> postPage = PageableExecutionUtils.getPage(posts, pageable, countQuery::fetchOne);

        if (posts.isEmpty()) {
            return new PageImpl<>(Collections.emptyList(), pageable, postPage.getTotalElements());
        }

        List<Long> postIds = posts.stream().map(Post::getId).toList();

        // 태그 정보 IN 쿼리로 한 번에 조회
        List<PostTag> allPostTags = postTagRepository.findByPostIdIn(postIds);
        Map<Long, List<String>> tagMap = allPostTags.stream()
                .collect(Collectors.groupingBy(
                        pt -> pt.getPost().getId(),
                        Collectors.mapping(pt -> pt.getTag().getName(), Collectors.toList())
                ));

        // 유저 액션(좋아요/스크랩) IN 쿼리로 한 번에 조회
        Set<Long> likedPostIds = new HashSet<>();
        Set<Long> scrappedPostIds = new HashSet<>();

        if (userId != null) {
            List<PostLikeScrap> userActions = postLikeScrapRepository.findByUserIdAndPostIdIn(userId, postIds);
            for (PostLikeScrap action : userActions) {
                if (action.getType() == PostLikeScrap.ActionType.LIKE) likedPostIds.add(action.getPost().getId());
                if (action.getType() == PostLikeScrap.ActionType.SCRAP) scrappedPostIds.add(action.getPost().getId());
            }
        }

        List<PostDto.ListResponse> responses = posts.stream().map(p -> {
            boolean isLiked = likedPostIds.contains(p.getId());
            boolean isScrapped = scrappedPostIds.contains(p.getId());
            List<String> tags = tagMap.getOrDefault(p.getId(), Collections.emptyList());
            int commentCount = 0; // TODO: 댓글 수 추가

            return new PostDto.ListResponse(p, tags, isScrapped, isLiked, commentCount);
        }).toList();

        return new PageImpl<>(responses, pageable, postPage.getTotalElements());
    }

    /**
     * 게시글 상세 조회
     */
    @Transactional
    public PostDto.Response getPostDetail(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));

        post.increaseViewCount();

        List<PostFile> files = postFileRepository.findByPostId(postId);
        List<PostTag> postTags = postTagRepository.findByPostId(postId);

        return new PostDto.Response(post, files, postTags);
    }

    // --- 동적 쿼리용 private 메서드 ---

    private BooleanExpression categoryEq(String category) {
        if (!StringUtils.hasText(category) || "전체".equals(category)) {
            return null;
        }
        return post.category.eq(category);
    }

    private BooleanExpression keywordContains(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return null;
        }
        return post.title.containsIgnoreCase(keyword).or(post.content.containsIgnoreCase(keyword));
    }

    private OrderSpecifier<?>[] createOrderSpecifier(String sortType) {
        if ("POPULAR".equalsIgnoreCase(sortType)) {
            return new OrderSpecifier[]{ post.likeCount.desc(), post.createdAt.desc() };
        }
        return new OrderSpecifier[]{ post.createdAt.desc() };
    }
}