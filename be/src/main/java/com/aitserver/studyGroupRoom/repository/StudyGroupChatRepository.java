package com.aitserver.studyGroupRoom.repository;


import com.aitserver.studyGroupRoom.entity.StudyGroupChat;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StudyGroupChatRepository extends JpaRepository<StudyGroupChat, Long> {
    @Query("SELECT c FROM StudyGroupChat c " +
            "WHERE c.studyGroup.id = :groupId " +
            "AND (:lastChatId IS NULL OR c.id < :lastChatId) " +
            "ORDER BY c.id DESC")
    Slice<StudyGroupChat> findChatsByCursor(
            @Param("groupId") Long groupId,
            @Param("lastChatId") Long lastChatId,
            Pageable pageable
    );

    @Query("SELECT c FROM StudyGroupChat c JOIN FETCH c.studyGroup JOIN FETCH c.user " +
            "WHERE c.id = :chatId AND c.studyGroup.id = :groupId")
    java.util.Optional<StudyGroupChat> findByIdAndGroupId(
            @Param("chatId") Long chatId,
            @Param("groupId") Long groupId
    );
}
