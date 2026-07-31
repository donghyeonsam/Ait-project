package com.aitserver.community.dto;

import com.aitserver.community.entity.PostComment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class CommentDto {

    @Data
    public static class CreateRequest {
        private Long parentId;
        private String content;
    }

    @Data
    public static class UpdateRequest {
        private String content;
    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long parentId;
        private Long userId;
        private String nickname;
        private String content;
        private Integer likeCount;
        private boolean isLiked;
        private LocalDateTime createdAt;
        private LocalDateTime deletedAt;

        @Builder.Default
        private List<Response> replies = new ArrayList<>();

        public static Response of(PostComment comment, boolean isLiked) {
            boolean isDeleted = comment.getDeletedAt() != null;

            return Response.builder()
                    .id(comment.getId())
                    .parentId(comment.isReply() ? comment.getParent().getId() : null)
                    .userId(isDeleted ? null : comment.getUser().getId())
                    .nickname(comment.getUser().getNickname())
                    .content(isDeleted ? "삭제된 댓글입니다." : comment.getContent())
                    .likeCount(isDeleted ? 0 : comment.getLikeCount())
                    .isLiked(isDeleted ? false : isLiked)
                    .createdAt(comment.getCreatedAt())
                    .deletedAt(comment.getDeletedAt())
                    .replies(new ArrayList<>())
                    .build();
        }
    }
}