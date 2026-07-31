package com.aitserver.aiInterview.repository;

import com.aitserver.aiInterview.entity.AiInterview;
import com.aitserver.aiInterview.responseDto.ReportListResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AiInterviewsRepository extends JpaRepository<AiInterview, Long> {

    @Modifying(clearAutomatically = true)
    @Query("UPDATE AiInterview " +
            "SET status = :status " +
            "WHERE id = :aiInterviewId AND userId = :userId")
    void updateStatus(@Param("userId") Long userId,
                      @Param("aiInterviewId") Long aiInterviewId,
                      @Param("status") String status);

    @Query("""
            select new com.aitserver.aiInterview.responseDto.ReportListResponse(
                i.id,
                i.interviewType,
                i.difficulty,
                i.aiAttitudeStyle,
                i.status,
                (r.eyeContactScore + r.faceScore + r.voiceScore + r.qnaScore + r.sentenceScore) / 5.0,
                i.createdAt,
                i.endedAt
            )
            from AiInterview i
            join AiComprehensiveReport r on r.aiInterviewId = i.id
            where i.userId = :userId
            order by i.createdAt desc
            """)
    List<ReportListResponse> findReportListByUserId(@Param("userId") Long userId);

    Optional<AiInterview> findByIdAndUserId(Long id, Long userId);
}
