package com.aitserver.peerFeedback.repository;


import com.aitserver.peerFeedback.entity.AiPeerSummary;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AiPeerSummaryRepository
        extends JpaRepository<AiPeerSummary, Long> {

    boolean existsByStudySession_Id(
            Long sessionId
    );

    @EntityGraph(attributePaths = {
            "evaluatee"
    })
    List<AiPeerSummary>
    findAllByStudySession_IdOrderByEvaluatee_IdAsc(
            Long sessionId
    );

    AiPeerSummary findByStudySessionIdAndEvaluateeId(Long sessionId, Long evaluateeId);

}