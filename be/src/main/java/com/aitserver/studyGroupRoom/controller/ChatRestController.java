package com.aitserver.studyGroupRoom.controller;

import com.aitserver.global.response.ApiResponse;
import com.aitserver.studyGroupRoom.dto.chat.ChatDto;
import com.aitserver.studyGroupRoom.service.chat.StudyGroupChatService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/study-groups")
public class ChatRestController {

    private final StudyGroupChatService chatService;

    /**
     * 채팅 위젯 활성화 시 과거 채팅 내역을 불러옵니다.
     * 프론트에서 /api/study-groups/{groupId}/chats?page=0&size=50 호출 시 작동
     */
    @GetMapping("/{groupId}/chats")
    public ResponseEntity<ApiResponse<ChatDto.CursorResponse>> getPastChats(
            @PathVariable Long groupId,
            @RequestParam(required = false) Long lastChatId,
            @PageableDefault(size = 50) Pageable pageable,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest servletRequest) {

        ChatDto.CursorResponse pastChats = chatService.getPastChats(groupId, userId, lastChatId, pageable);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "채팅 목록 조회 성공",
                pastChats,
                servletRequest
        ));
    }
}
