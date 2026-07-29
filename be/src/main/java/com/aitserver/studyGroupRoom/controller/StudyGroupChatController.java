package com.aitserver.studyGroupRoom.controller;

import com.aitserver.studyGroupRoom.dto.chat.ChatDto;
import com.aitserver.studyGroupRoom.service.chat.StudyGroupChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class StudyGroupChatController {

    // STOMP 우체국 역할: 특정 경로(Topic)를 구독 중인 유저들에게 데이터를 쏴주는 객체
    private final SimpMessagingTemplate messagingTemplate;

    // DB 저장 및 유저 정보 조회를 담당할 서비스
    private final StudyGroupChatService chatService;

    /**
     * 프론트엔드가 "/app/study-groups/{groupId}/messages" 로 보낸 메시지를 가로챕니다.
     */
    @MessageMapping("/study-groups/{groupId}/messages")
    public void sendMessage(
            @DestinationVariable Long groupId,
            @Payload ChatDto.Request request,
            Authentication authentication) {

        Long currentUserId = Long.valueOf(authentication.getPrincipal().toString());

        // 1. 서비스 로직 호출: 채팅을 DB에 저장하고, 유저 닉네임/프사가 포함된 Response DTO로 반환받습니다.
        ChatDto.Response response = chatService.saveChat(groupId, currentUserId, request.getMessage());

        // 2. 우체국을 통해 구독자들에게 배달
        // "/topic/study-groups/1" 을 구독하고 있는 모든 클라이언트에게 방금 저장된 채팅 내역을 쏴줍니다.
        messagingTemplate.convertAndSend("/topic/study-groups/" + groupId, response);
    }
}