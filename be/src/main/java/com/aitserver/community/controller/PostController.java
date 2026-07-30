package com.aitserver.community.controller;


import com.aitserver.community.dto.PostDto;
import com.aitserver.community.service.PostSearchService;
import com.aitserver.community.service.PostService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final PostSearchService postSearchService;

    /**
     * 1. 게시글 목록 조회 (검색 및 필터링)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<PostDto.ListResponse>>> getPosts(
            @ModelAttribute PostDto.SearchCondition condition,
            @PageableDefault(size = 3) Pageable pageable,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        Page<PostDto.ListResponse> posts = postSearchService.getPosts(userId, condition, pageable);

        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "게시글 목록 조회 성공", posts, request));
    }

    /**
     * 2. 게시글 상세 조회
     */
    @GetMapping("/{postId}")
    public ResponseEntity<ApiResponse<PostDto.Response>> getPostDetail(
            @PathVariable("postId") Long postId,
            HttpServletRequest request) {

        PostDto.Response response = postSearchService.getPostDetail(postId);

        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "게시글 상세 조회 성공", response, request));
    }

    /**
     * 3. 게시글 작성
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Long>> createPost(
            @AuthenticationPrincipal Long userId,
            @RequestBody PostDto.CreateRequest createRequest,
            HttpServletRequest request) {

        Long postId = postService.createPost(userId, createRequest);

        return ResponseEntity.ok(ApiResponse.success(HttpStatus.CREATED, "게시글 작성 성공", postId, request));
    }

    /**
     * 4. 게시글 수정
     */
    @PutMapping("/{postId}")
    public ResponseEntity<ApiResponse<Void>> updatePost(
            @AuthenticationPrincipal Long userId,
            @PathVariable("postId") Long postId,
            @RequestBody PostDto.UpdateRequest updateRequest,
            HttpServletRequest request) {

        postService.updatePost(userId, postId, updateRequest);

        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "게시글 수정 성공", request));
    }

    /**
     * 5. 게시글 삭제
     */
    @DeleteMapping("/{postId}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @AuthenticationPrincipal Long userId,
            @PathVariable("postId") Long postId,
            HttpServletRequest request) {

        postService.deletePost(userId, postId);

        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "게시글 삭제 성공", request));
    }
}