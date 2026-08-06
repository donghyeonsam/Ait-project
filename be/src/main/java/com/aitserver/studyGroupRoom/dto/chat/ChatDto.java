package com.aitserver.studyGroupRoom.dto.chat;

import com.aitserver.studyGroupRoom.entity.StudyGroupChat;
import com.aitserver.studyGroupRoom.entity.StudyGroupChatReaction;
import com.aitserver.studyGroupRoom.entity.StudyGroupFile;
import com.aitserver.studyGroupRoom.enums.ChatType;
import com.aitserver.studyGroupRoom.enums.FileType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ChatDto {

    // 💡 프론트엔드 -> 백엔드 (메시지와 파일 목록을 한 번에 받음)
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {
        private ChatType chatType;       // TEXT, FILE, SYSTEM
        private String message;          // 파일 전송 시 null일 수 있음
        private List<FileDto> files = new ArrayList<>(); // 다중 파일 지원
    }

    // 💡 파일 정보를 담는 내부 DTO
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FileDto {
        private String originalFilename;
        private String storedFilename;
        private FileType fileType;
        private Long fileSize;

        public static FileDto from(StudyGroupFile file) {
            return FileDto.builder()
                    .originalFilename(file.getOriginalFilename())
                    .storedFilename(file.getStoredFilename())
                    .fileType(file.getFileType())
                    .fileSize(file.getFileSize())
                    .build();
        }
    }

    // 백엔드 -> 프론트엔드
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

        private ChatType chatType;
        private String message;
        private List<FileDto> files;

        private LocalDateTime createdAt;
        private List<ReactionSummary> reactions;

        public static Response from(StudyGroupChat chat, String senderNickname, String profileImageUrl) {
            return Response.builder()
                    .chatId(chat.getId())
                    .groupId(chat.getStudyGroup().getId())
                    .senderId(chat.getUser().getId())
                    .senderNickname(senderNickname)
                    .profileImageUrl(profileImageUrl)
                    .chatType(chat.getChatType())

                    .files(chat.getFiles().stream()
                            .map(FileDto::from)
                            .toList())

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
        private List<Response> chats;
        private boolean hasNext;
    }
}