package com.aitserver.aiInterview.repository;

import com.aitserver.aiInterview.entity.AiInterview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AiInterviewsRepository extends JpaRepository<AiInterview, Long> {

    @Modifying
    @Query("UPDATE AiInterview " +
            "SET status = 'doing' " +
            "WHERE id = :aiInterviewId AND userId = :userId")
    void updateStatus(@Param("userId") Long userId, @Param("aiInterviewId") Long aiInterviewId);
}
