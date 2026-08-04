package com.aitserver.community.service;

import com.aitserver.community.dto.PostDto;
import com.aitserver.community.entity.*;
import com.aitserver.community.repository.*;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.nimbusds.jose.jwk.ThumbprintURI;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.JPAExpressions;
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

import static com.aitserver.user.entity.QUser.user;
import static com.aitserver.community.entity.QPost.post;
import static com.aitserver.community.entity.QPostTag.postTag;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostSearchService {

    private final JPAQueryFactory queryFactory;
    private final PostRepository postRepository;
    private final PostTagRepository postTagRepository;
    private final PostLikeScrapRepository postLikeScrapRepository;
    private final PostFileRepository postFileRepository;
    private final PostCommentRepository postCommentRepository;

    /**
     * 게시글 목록 조회 (검색 + 정렬 + 페이징 + N+1 최적화)
     */
    public Page<PostDto.ListResponse> getPosts(Long userId, PostDto.SearchCondition condition, Pageable pageable) {

        List<Post> posts = queryFactory
                .selectFrom(post)
                .join(post.user, user).fetchJoin() // 작성자 닉네임 한 번에 조인
                .where(
                        categoryEq(condition.getCategory()),
                        buildSearchCondition(condition.getKeyword(), condition.getTag())
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
                        buildSearchCondition(condition.getKeyword(), condition.getTag())
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

        // 썸네일 정보 IN 쿼리로 조립 (UsageType.INLINE 조건만 사용)
        List<PostFile> allPostImages = postFileRepository.findByPostIdInAndUsageType(postIds, PostFile.UsageType.INLINE);
        Map<Long, String> thumbnailMap = allPostImages.stream()
                .collect(Collectors.toMap(
                        pf -> pf.getPost().getId(),
                        PostFile::getStoredFilename,
                        (existing, replacement) -> existing // 여러 개라도 첫 번째 파일만 썸네일로 사용
                ));

        List<Object[]> commentCounts = postCommentRepository.countCommentsByPostIdIn(postIds);
        Map<Long, Integer> commentCountMap = commentCounts.stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],                       // 게시글 ID
                        row -> ((Long) row[1]).intValue()           // 댓글 수
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
            String thumbnailUrl = thumbnailMap.get(p.getId());
            int commentCount = commentCountMap.getOrDefault(p.getId(), 0);

            return new PostDto.ListResponse(p, tags, isScrapped, isLiked, commentCount, thumbnailUrl);
        }).toList();

        return new PageImpl<>(responses, pageable, postPage.getTotalElements());
    }

    /**
     * 게시글 상세 조회
     */
    @Transactional
    public PostDto.Response getPostDetail(Long postId, Long userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));

        post.increaseViewCount();

        List<PostFile> files = postFileRepository.findByPostId(postId);
        List<PostTag> postTags = postTagRepository.findByPostId(postId);

        boolean isLiked = false;
        boolean isScrapped = false;

        if (userId != null) { // 로그인한 유저인 경우에만 DB 조회
            isLiked = postLikeScrapRepository.existsByPostIdAndUserIdAndType(
                    postId, userId, PostLikeScrap.ActionType.LIKE
            );
            isScrapped = postLikeScrapRepository.existsByPostIdAndUserIdAndType(
                    postId, userId, PostLikeScrap.ActionType.SCRAP
            );
        }

        return new PostDto.Response(post, files, postTags, isLiked, isScrapped);
    }

    // --- 동적 쿼리용 private 메서드 ---

    private BooleanExpression categoryEq(String category) {
        if (!StringUtils.hasText(category) || "전체".equals(category)) {
            return null;
        }
        return post.category.eq(category);
    }

    private BooleanBuilder buildSearchCondition(String keyword, String tag) {
        BooleanBuilder builder = new BooleanBuilder();

        // 1. keyword가 있는 경우 (제목+내용 부분 일치)
        if (StringUtils.hasText(keyword)) {
            builder.or(post.title.containsIgnoreCase(keyword)
                    .or(post.content.containsIgnoreCase(keyword)));
        }

        // 2. tag가 있는 경우 (태그 완전 일치)
        if (StringUtils.hasText(tag)) {
            builder.or(post.id.in(
                    JPAExpressions
                            .select(postTag.post.id)
                            .from(postTag)
                            .join(postTag.tag, QTag.tag)
                            .where(QTag.tag.name.eq(tag))
            ));
        }

        // 조건이 하나라도 들어갔으면 builder 반환, 둘 다 빈 값이면 null 반환(전체조회)
        return builder.hasValue() ? builder : null;
    }

    private OrderSpecifier<?>[] createOrderSpecifier(String sortType) {
        if ("POPULAR".equalsIgnoreCase(sortType)) {
            return new OrderSpecifier[]{ post.likeCount.desc(), post.createdAt.desc() };
        }
        return new OrderSpecifier[]{ post.createdAt.desc() };
    }
}