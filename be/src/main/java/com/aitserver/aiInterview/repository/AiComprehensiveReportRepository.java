package com.aitserver.aiInterview.repository;

import com.aitserver.aiInterview.entity.AiComprehensiveReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AiComprehensiveReportRepository extends JpaRepository<AiComprehensiveReport, Long> {

    Optional<AiComprehensiveReport> findByAiInterviewId(Long aiInterviewId);
}
