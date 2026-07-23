package com.aitserver.aiInterview.repository;

import com.aitserver.aiInterview.entity.AiInterview;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiInterviewsRepository extends JpaRepository<AiInterview, Long> {
}
