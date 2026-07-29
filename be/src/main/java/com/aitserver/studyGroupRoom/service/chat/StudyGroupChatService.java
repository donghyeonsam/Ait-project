package com.aitserver.studyGroupRoom.service.chat;

import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.studyGroupRoom.dto.chat.ChatDto;
import com.aitserver.studyGroupRoom.dto.chat.ChatNoticeDto;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.entity.StudyGroupChat;
import com.aitserver.studyGroupRoom.repository.StudyGroupChatRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

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
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        // 2. 목적지 스터디 그룹 엔티티 조회
        StudyGroup studyGroup = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_GROUP_NOT_FOUND));

        // 3. 그룹 멤버 확인
        studyGroup.validateMember(user.getId());

        // 4. 채팅 엔티티 생성
        StudyGroupChat chat = StudyGroupChat.builder()
                .studyGroup(studyGroup)
                .user(user)
                .message(message)
                .build();

        // 5. DB에 저장
        StudyGroupChat savedChat = chatRepository.save(chat);

        // 6. Response DTO로 변환
        return ChatDto.Response.from(savedChat, user.getNickname(), user.getProfileImage());
    }

    @Transactional
    public ChatNoticeDto.Response updateNotice(Long groupId, Long userId, String notice) {

        // 1. 스터디 그룹 조회
        StudyGroup studyGroup = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_GROUP_NOT_FOUND));

        // 2. 그룹장 검증
        if (!studyGroup.isOwner(userId)) {
            // 방장이 아닐 경우 권한 에러 발생
            throw new BusinessException(ErrorCode.STUDY_GROUP_ACCESS_DENIED);
        }

        // 3. 공지사항 덮어쓰기
        studyGroup.updateChatNotice(notice);

        // 4. 프론트로 내려줄 Response DTO 생성
        return ChatNoticeDto.Response.builder()
                .groupId(groupId)
                .notice(notice)
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Transactional
    public ChatNoticeDto.Response deleteNotice(Long groupId, Long userId) {

        StudyGroup studyGroup = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_GROUP_NOT_FOUND));

        // 🚨 그룹장 검증
        if (!studyGroup.isOwner(userId)) {
            throw new BusinessException(ErrorCode.STUDY_GROUP_ACCESS_DENIED);
        }

        // 공지사항 삭제
        studyGroup.deleteChatNotice();

        // 프론트로 내려줄 Response DTO
        return ChatNoticeDto.Response.builder()
                .groupId(groupId)
                .notice(null)
                .updatedAt(LocalDateTime.now())
                .build();
    }
}
