package com.aitserver.aiInterview.repository;

import com.aitserver.aiInterview.dto.CoverLetterInfoForAiInterview;
import com.aitserver.coverletter.entity.CoverLetter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AiInterviewCoverLetterRepository extends JpaRepository<CoverLetter, Long> {

    // id, title, company_name, updated_at만 가져오면 된다.
    @Query("SELECT new com.aitserver.aiInterview.dto.CoverLetterInfoForAiInterview(" +
            "c.id, c.title, c.companyName, c.updatedAt) " +
            "FROM CoverLetter c " +
            "WHERE c.user.id = :userId " +
            "ORDER BY c.updatedAt DESC")
    List<CoverLetterInfoForAiInterview> findCoverLetterInfoByUserId(@Param("userId") Long userId);
}
