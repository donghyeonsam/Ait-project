package com.aitserver.studyGroupRoom.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class ChatNoticeDto {

    // 프론트 -> 백엔드
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {
        private String notice;
    }

    // 백엔드 -> 프론트
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long groupId;
        private String notice;
        private LocalDateTime updatedAt;
    }
}