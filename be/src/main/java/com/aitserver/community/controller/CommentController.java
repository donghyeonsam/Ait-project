package com.aitserver.community.controller;

import com.aitserver.community.dto.CommentDto;
import com.aitserver.community.service.CommentService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // ==========================================
    // 1. 게시글 기준 (목록 조회 및 생성)
    // ==========================================

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<ApiResponse<List<CommentDto.Response>>> getComments(
            @PathVariable("postId") Long postId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        List<CommentDto.Response> responses = commentService.getComments(userId, postId);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "댓글 목록 조회 성공", responses, request));
    }

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<ApiResponse<Long>> createComment(
            @PathVariable("postId") Long postId,
            @AuthenticationPrincipal Long userId,
            @RequestBody CommentDto.CreateRequest createRequest,
            HttpServletRequest request) {

        Long commentId = commentService.createComment(userId, postId, createRequest);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.CREATED, "댓글 작성 성공", commentId, request));
    }

    // ==========================================
    // 2. 단일 댓글 기준 (수정, 삭제)
    // ==========================================

    @PutMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> updateComment(
            @PathVariable("commentId") Long commentId,
            @AuthenticationPrincipal Long userId,
            @RequestBody CommentDto.UpdateRequest updateRequest,
            HttpServletRequest request) {

        commentService.updateComment(userId, commentId, updateRequest);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "댓글 수정 성공", null, request));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable("commentId") Long commentId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        commentService.deleteComment(userId, commentId);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "댓글 삭제 성공", null, request));
    }

    // ==========================================
    // 3. 댓글 좋아요
    // ==========================================

    @PostMapping("/comments/{commentId}/likes")
    public ResponseEntity<ApiResponse<Void>> addLike(
            @PathVariable("commentId") Long commentId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        commentService.addLike(userId, commentId);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "댓글 좋아요 등록 성공", null, request));
    }

    @DeleteMapping("/comments/{commentId}/likes")
    public ResponseEntity<ApiResponse<Void>> removeLike(
            @PathVariable("commentId") Long commentId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        commentService.removeLike(userId, commentId);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "댓글 좋아요 취소 성공", null, request));
    }
}
