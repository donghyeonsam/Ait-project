package com.aitserver.studyGroupRoom.repository;


import com.aitserver.studyGroupRoom.entity.StudyGroupChat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudyGroupChatRepository extends JpaRepository<StudyGroupChat, Long> { }
