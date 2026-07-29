package com.aitserver.studyGroupRoom.dto.chat;

import com.aitserver.studyGroupRoom.entity.StudyGroupChat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class ChatDto {

    // 1. 프론트엔드 -> 백엔드
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {
        private String message;
    }

    // 2. 백엔드 -> 프론트엔드 (채팅 뿌려줄 때)
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long chatId;
        private Long groupId;
        private Long senderId;
        private String senderNickname;
        private String profileImageUrl;
        private String message;
        private LocalDateTime createdAt;

        public static Response from(StudyGroupChat chat, String senderNickname, String profileImageUrl) {
            return Response.builder()
                    .chatId(chat.getId())
                    .groupId(chat.getStudyGroup().getId())
                    .senderId(chat.getUser().getId())
                    .senderNickname(senderNickname)
                    .profileImageUrl(profileImageUrl)
                    .message(chat.getMessage())
                    .createdAt(chat.getCreatedAt())
                    .build();
        }
    }
}