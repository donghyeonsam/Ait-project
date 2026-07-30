package com.aitserver.studyGroupRoom.repository;

import com.aitserver.studyGroupRoom.entity.StudyGroupChatReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudyGroupChatReactionRepository extends JpaRepository<StudyGroupChatReaction, Long> {

    Optional<StudyGroupChatReaction> findByChatIdAndUserIdAndEmoji(
            Long chatId,
            Long userId,
            String emoji
    );

    List<StudyGroupChatReaction> findAllByChatIdOrderByIdAsc(Long chatId);
}
