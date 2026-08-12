package com.aitserver.studyGroupRoom.controller;

import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.entity.StudyGroupChat;
import com.aitserver.studyGroupRoom.enums.ChatType;
import com.aitserver.studyGroupRoom.repository.StudyGroupChatRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupRepository;
import com.aitserver.user.entity.User;
import com.aitserver.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class DummyChatController {

    private final StudyGroupChatRepository chatRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final UserRepository userRepository;

    // 포스트맨이나 브라우저로 POST /api/dummy/chats/1 (1번 스터디그룹) 호출
    @PostMapping("/api/dummy/chats/{groupId}")
    public String createDummyChats(@PathVariable Long groupId) {

        StudyGroup group = studyGroupRepository.findById(groupId).orElseThrow();
        User user = userRepository.findById(1L).orElseThrow(); // 존재하는 아무 유저 PK

        List<StudyGroupChat> dummyChats = new ArrayList<>();

        // 5만 건의 채팅 데이터 생성 (필요에 따라 10만 건으로 늘려도 됩니다)
        for (int i = 0; i < 50000; i++) {
            StudyGroupChat chat = StudyGroupChat.builder()
                    .studyGroup(group)
                    .user(user)
                    .chatType(ChatType.TEXT)
                    .message("더미 채팅 메시지 테스트입니다 번호: " + i)
                    .build();
            dummyChats.add(chat);
        }

        // saveAll을 사용하여 한 번에 묶어서(Batch) DB에 삽입 (매우 빠름)
        chatRepository.saveAll(dummyChats);

        return "채팅 더미 데이터 5만건 생성 완료!";
    }
}