package com.aitserver.studyGroupRoom.dto.chat;

import com.aitserver.studyGroupRoom.entity.StudyGroupFile;
import com.aitserver.studyGroupRoom.enums.FileType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class StudyGroupFileDto {

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long fileId;
        private Long chatId;
        private Long uploaderId;
        private String uploaderNickname;
        private String originalFilename;
        private String storedFilename;
        private FileType fileType;
        private Long fileSize;
        private LocalDateTime createdAt;

        public static Response from(StudyGroupFile file) {
            return Response.builder()
                    .fileId(file.getId())
                    .chatId(file.getChat().getId())
                    .uploaderId(file.getUser().getId())
                    .uploaderNickname(file.getUser().getNickname())
                    .originalFilename(file.getOriginalFilename())
                    .storedFilename(file.getStoredFilename())
                    .fileType(file.getFileType())
                    .fileSize(file.getFileSize())
                    .createdAt(file.getCreatedAt())
                    .build();
        }
    }
}