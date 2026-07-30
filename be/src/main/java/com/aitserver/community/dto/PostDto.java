package com.aitserver.community.dto;

import com.aitserver.community.entity.Post;
import com.aitserver.community.entity.PostFile;
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
}