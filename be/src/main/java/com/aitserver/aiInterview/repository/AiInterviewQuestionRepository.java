package com.aitserver.aiInterview.repository;

import com.aitserver.aiInterview.entity.AiInterviewQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiInterviewQuestionRepository extends JpaRepository<AiInterviewQuestion, Long> {

    List<AiInterviewQuestion> findAllByAiInterviewId(Long aiInterviewId);
}
