package com.aitserver.community.dto;

import com.aitserver.community.entity.Post;
import com.aitserver.community.entity.PostFile;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class PostDto {

    // 1. 파일/이미지 처리를 위한 서브 Request DTO
    @Getter
    @NoArgsConstructor
    public static class FileRequest {
        private String originalFilename;
        private String storedFilename;
        private PostFile.FileType fileType;       // IMAGE, PDF, OTHER
        private PostFile.UsageType usageType;     // INLINE(본문삽입), ATTACHMENT(첨부)
    }

    // 2. 파일/이미지 응답을 위한 서브 Response DTO
    @Getter
    public static class FileResponse {
        private final Long id;
        private final String originalFilename;
        private final String storedFilename;
        private final PostFile.FileType fileType;
        private final PostFile.UsageType usageType;

        public FileResponse(PostFile postFile) {
            this.id = postFile.getId();
            this.originalFilename = postFile.getOriginalFilename();
            this.storedFilename = postFile.getStoredFilename();
            this.fileType = postFile.getFileType();
            this.usageType = postFile.getUsageType();
        }
    }

    // 3. 게시글 작성 Request
    @Getter
    @NoArgsConstructor
    public static class CreateRequest {
        private String category;
        private String title;
        private String content;
        private Boolean allowComments;
        private Boolean receiveNotifications;
        private List<String> tags;
        private List<FileRequest> files;
    }

    // 4. 게시글 수정 Request
    @Getter
    @NoArgsConstructor
    public static class UpdateRequest {
        private String category;
        private String title;
        private String content;
        private Boolean allowComments;
        private Boolean receiveNotifications;
        private List<String> tags;
        private List<FileRequest> files;
    }

    // 5. 게시글 상세 조회 Response
    @Getter
    public static class Response {
        private final Long id;
        private final Long userId;
        private final String nickname;
        private final String category;
        private final String title;
        private final String content;

        private final Boolean allowComments;
        private final Boolean receiveNotifications;
        private final Integer likeCount;
        private final Integer viewCount;

        // 리스트 데이터
        private final List<String> tags;
        private final List<FileResponse> files;

        private final LocalDateTime createdAt;
        private final LocalDateTime updatedAt;

        public Response(Post post, List<PostFile> files, List<String> tags) {
            this.id = post.getId();
            this.userId = post.getUser().getId();
            this.nickname = post.getUser().getNickname();
            this.category = post.getCategory();
            this.title = post.getTitle();
            this.content = post.getContent();

            this.allowComments = post.getAllowComments();
            this.receiveNotifications = post.getReceiveNotifications();
            this.likeCount = post.getLikeCount();
            this.viewCount = post.getViewCount();

            this.tags = tags;
            this.files = files.stream()
                    .map(FileResponse::new)
                    .collect(Collectors.toList());

            this.createdAt = post.getCreatedAt();
            this.updatedAt = post.getUpdatedAt();
        }
    }

    @Data
    public static class SearchCondition {
        private String keyword;       // 검색어 (제목, 내용, 태그 완전일치)
        private String category;      // 카테고리 (면접 후기, 질문 답변 등)
        private String sortType;      // LATEST(최신순), POPULAR(인기순)
    }

    // 목록 조회 응답 (요구사항 모두 반영)
    @Getter
    public static class ListResponse {
        private final Long id;
        private final String category;
        private final String title;
        private final String contentSummary; // 글 내용 한 줄
        private final String nickname;

        private final List<String> tags;     // 태그 리스트

        private final int viewCount;
        private final int commentCount;      // 댓글 수
        private final int likeCount;

        private final boolean isBookmarked;  // 북마크 여부
        private final boolean isLiked;       // 좋아요 여부

        private final LocalDateTime createdAt;

        public ListResponse(Post post, List<String> tags, boolean isBookmarked, boolean isLiked, int commentCount) {
            this.id = post.getId();
            this.category = post.getCategory();
            this.title = post.getTitle();
            this.nickname = post.getUser().getName();
            // 본문 내용을 50자 이내의 한 줄로 요약
            this.contentSummary = post.getContent() != null && post.getContent().length() > 50
                    ? post.getContent().substring(0, 50) + "..."
                    : post.getContent();
            this.tags = tags;
            this.viewCount = post.getViewCount();
            this.likeCount = post.getLikeCount();
            this.commentCount = commentCount;
            this.isBookmarked = isBookmarked;
            this.isLiked = isLiked;
            this.createdAt = post.getCreatedAt();
        }
    }
}