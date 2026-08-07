package com.aitserver.studyGroupRoom.service.chat;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.studyGroupRoom.dto.chat.ChatDto;
import com.aitserver.studyGroupRoom.dto.chat.ChatNoticeDto;
import com.aitserver.studyGroupRoom.dto.chat.ChatReactionDto;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.entity.StudyGroupChat;
import com.aitserver.studyGroupRoom.entity.StudyGroupChatReaction;
import com.aitserver.studyGroupRoom.entity.StudyGroupFile;
import com.aitserver.studyGroupRoom.enums.ChatType;
import com.aitserver.studyGroupRoom.repository.StudyGroupChatReactionRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupChatRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupRepository;
import com.aitserver.user.entity.User;
import com.aitserver.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyGroupChatService {

    private final StudyGroupChatRepository chatRepository;
    private final StudyGroupChatReactionRepository reactionRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final UserRepository userRepository;

    @Transactional
    public ChatDto.Response saveChat(Long groupId, Long userId, ChatDto.Request request) {

        // 1. 발송 유저 및 그룹 엔티티 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));
        StudyGroup studyGroup = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_GROUP_NOT_FOUND));

        // 2. 그룹 멤버 확인
        studyGroup.validateMember(user.getId());

        // 3. 채팅(부모) 엔티티 생성
        StudyGroupChat chat = StudyGroupChat.builder()
                .studyGroup(studyGroup)
                .user(user)
                .chatType(request.getChatType() != null ? request.getChatType() : ChatType.TEXT)
                .message(request.getMessage())
                .build();

        // 4. 첨부 파일이 존재하면 자식 엔티티 생성 및 연관관계 매핑
        if (request.getFiles() != null && !request.getFiles().isEmpty()) {
            for (ChatDto.FileDto fileDto : request.getFiles()) {
                StudyGroupFile file = StudyGroupFile.builder()
                        .studyGroup(studyGroup) // 모아보기용 연관관계
                        .user(user)             // 업로더
                        .originalFilename(fileDto.getOriginalFilename())
                        .storedFilename(fileDto.getStoredFilename())
                        .fileType(fileDto.getFileType())
                        .fileSize(fileDto.getFileSize())
                        .build();

                chat.addFile(file); // 💡 중요: 연관관계 편의 메서드 호출
            }
        }

        // 5. DB에 저장 (chat만 저장해도 cascade = CascadeType.ALL에 의해 file들도 자동 저장됨)
        StudyGroupChat savedChat = chatRepository.save(chat);

        // 6. Response DTO로 변환하여 반환 (방 안의 사람들에게 웹소켓으로 뿌려줄 객체)
        return ChatDto.Response.from(savedChat, user.getNickname(), user.getProfileImage());
    }

    @Transactional
    public ChatReactionDto.Response toggleReaction(
            Long groupId,
            Long chatId,
            Long userId,
            String emoji
    ) {
        String normalizedEmoji = emoji == null ? "" : emoji.trim();
        if (normalizedEmoji.isEmpty() || normalizedEmoji.length() > 32) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }

        StudyGroupChat chat = chatRepository.findByIdAndGroupId(chatId, groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_GROUP_CHAT_NOT_FOUND));
        chat.getStudyGroup().validateMember(userId);

        if (chat.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.STUDY_GROUP_CHAT_SELF_REACTION);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        reactionRepository.findByChatIdAndUserIdAndEmoji(chatId, userId, normalizedEmoji)
                .ifPresentOrElse(
                        reactionRepository::delete,
                        () -> reactionRepository.save(
                                new StudyGroupChatReaction(chat, user, normalizedEmoji)
                        )
                );
        reactionRepository.flush();

        return ChatReactionDto.Response.builder()
                .groupId(groupId)
                .chatId(chatId)
                .reactions(ChatDto.ReactionSummary.from(
                        reactionRepository.findAllByChatIdOrderByIdAsc(chatId)
                ))
                .build();
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

    @Transactional(readOnly = true)
    public ChatDto.CursorResponse getPastChats(Long groupId, Long userId, Long lastChatId, Pageable pageable) {

        // 1. 스터디 그룹 엔티티 조회
        StudyGroup studyGroup = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_GROUP_NOT_FOUND));

        // 2. 그룹 멤버인지 권한 확인
        studyGroup.validateMember(userId);

        // 3. 채팅 내역 조회
        Slice<StudyGroupChat> chatSlice = chatRepository.findChatsByCursor(groupId, lastChatId, pageable);

        // 4. DTO 변환 후 반환
        List<ChatDto.Response> chatList = chatSlice.getContent().stream()
                .map(chat -> ChatDto.Response.from(
                        chat,
                        chat.getUser().getNickname(),
                        chat.getUser().getProfileImage()
                ))
                .toList();

        return new ChatDto.CursorResponse(chatList, chatSlice.hasNext());
    }
}
