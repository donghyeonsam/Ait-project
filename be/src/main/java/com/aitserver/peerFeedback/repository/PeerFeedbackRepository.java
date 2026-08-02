package com.aitserver.peerFeedback.repository;

import com.aitserver.peerFeedback.entity.PeerFeedback;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PeerFeedbackRepository extends JpaRepository<PeerFeedback, Long> {


    // 세션 아이디와 작성자 아이디가 같으면 조회
    List<PeerFeedback> findAllByStudySessionIdAndEvaluatorId(
            Long sessionId,
            Long evaluatorId
    );

    // 받는사람 아이디가 같으면 조회
    List<PeerFeedback> findAllByStudySessionIdAndEvaluateeId(
            Long sessionId,
            Long evaluateeId

    );

    List<PeerFeedback> findAllByEvaluateeId(Long evaluateeId);

    // summary 생성용
    List<PeerFeedback> findAllByStudySessionId(
            Long sessionId
    );


}
