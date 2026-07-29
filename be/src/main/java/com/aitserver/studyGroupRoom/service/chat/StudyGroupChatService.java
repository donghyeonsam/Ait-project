package com.aitserver.studyGroupRoom.service.chat;

import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import com.aitserver.studyGroupRoom.dto.chat.ChatDto;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.entity.StudyGroupChat;
import com.aitserver.studyGroupRoom.repository.StudyGroupChatRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyGroupChatService {

    private final StudyGroupChatRepository chatRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final UserRepository userRepository;

    @Transactional // 데이터를 삽입(Save)해야 하므로 쓰기 권한 부여
    public ChatDto.Response saveChat(Long groupId, Long userId, String message) {

        // 1. 발송 유저 엔티티 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        // 2. 목적지 스터디 그룹 엔티티 조회
        StudyGroup studyGroup = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 스터디 그룹입니다."));

        //그룹 멤버 확인
        studyGroup.validateMember(user.getId());


        // 3. 채팅 엔티티 생성
        StudyGroupChat chat = StudyGroupChat.builder()
                .studyGroup(studyGroup)
                .user(user)
                .message(message)
                .build();

        // 4. DB에 저장
        StudyGroupChat savedChat = chatRepository.save(chat);

        // 5. Response DTO로 변환
        return ChatDto.Response.from(savedChat, user.getNickname(), user.getProfileImage());
    }
}