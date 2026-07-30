package com.aitserver.studyGroupRoom.dto.chat;

import com.aitserver.studyGroupRoom.entity.StudyGroupChat;
import com.aitserver.studyGroupRoom.entity.StudyGroupChatReaction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

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
        private List<ReactionSummary> reactions;

        public static Response from(StudyGroupChat chat, String senderNickname, String profileImageUrl) {
            return Response.builder()
                    .chatId(chat.getId())
                    .groupId(chat.getStudyGroup().getId())
                    .senderId(chat.getUser().getId())
                    .senderNickname(senderNickname)
                    .profileImageUrl(profileImageUrl)
                    .message(chat.getMessage())
                    .createdAt(chat.getCreatedAt())
                    .reactions(ReactionSummary.from(chat.getReactions()))
                    .build();
        }
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReactionSummary {
        private String emoji;
        private int count;
        private List<Long> userIds;

        public static List<ReactionSummary> from(List<StudyGroupChatReaction> reactions) {
            Map<String, List<Long>> usersByEmoji = new LinkedHashMap<>();
            reactions.forEach(reaction ->
                    usersByEmoji
                            .computeIfAbsent(reaction.getEmoji(), ignored -> new java.util.ArrayList<>())
                            .add(reaction.getUser().getId())
            );

            return usersByEmoji.entrySet().stream()
                    .map(entry -> ReactionSummary.builder()
                            .emoji(entry.getKey())
                            .count(entry.getValue().size())
                            .userIds(List.copyOf(entry.getValue()))
                            .build())
                    .toList();
        }
    }

    @Getter
    @AllArgsConstructor
    public static class CursorResponse {
        private List<Response> chats; // 채팅 목록
        private boolean hasNext;      // 다음 데이터 존재 여부
    }
}
