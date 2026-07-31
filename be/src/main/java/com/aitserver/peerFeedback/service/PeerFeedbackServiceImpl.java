package com.aitserver.peerFeedback.service;


import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.peerFeedback.dto.PeerFeedbackCreateRequest;
import com.aitserver.peerFeedback.dto.PeerFeedbackDetailResponse;
import com.aitserver.peerFeedback.entity.PeerFeedback;
import com.aitserver.peerFeedback.repository.PeerFeedbackRepository;
import com.aitserver.studySession.entity.StudySession;
import com.aitserver.studySession.repository.StudySessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class PeerFeedbackServiceImpl implements PeerFeedbackService{
    private final PeerFeedbackRepository peerFeedbackRepository;
    private final StudySessionRepository studySessionRepository;

    @Override
    public PeerFeedbackDetailResponse getPeerFeedbackDetail(Long peerId) {

        PeerFeedback peerFeedback = peerFeedbackRepository.findById(peerId)
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.PEER_FEEDBACK_NOT_FOUND)
                );


        return PeerFeedbackDetailResponse.from(peerFeedback);
    }

    @Override
    public List<PeerFeedbackDetailResponse> getPeerFeedbackWrightList(Long sessionId, Long userId) {

        List<PeerFeedback> list = peerFeedbackRepository.findAllByStudySessionIdAndEvaluatorId(sessionId, userId);

        List<PeerFeedbackDetailResponse> responseList =
                list.stream()
                        .map(PeerFeedbackDetailResponse::from)
                        .toList();


        return responseList;
    }

    @Override
    public List<PeerFeedbackDetailResponse> getPeerFeedbackReceiveList(Long userId) {

        List<PeerFeedback> list = peerFeedbackRepository.findAllByEvaluateeId(userId);

        List<PeerFeedbackDetailResponse> responseList =
                list.stream()
                        .map(PeerFeedbackDetailResponse::from)
                        .toList();

        return responseList;
    }

    @Override
    public PeerFeedbackDetailResponse createPeerFeedback(PeerFeedbackCreateRequest request, Long userId, Long sessionId) {

        StudySession studySession = studySessionRepository.findById(sessionId)
                .orElseThrow(
                        () -> new BusinessException(ErrorCode.STUDY_SESSION_NOT_FOUND)
                );


        PeerFeedback peerFeedback = PeerFeedback.create(
                studySession,
                userId,
                request.getEvaluateeId(),
                request.getLogicalScore(),
                request.getCommunicationScore(),
                request.getAttitudeScore(),
                request.getJobCompetencyScore(),
                request.getConfidenceScore(),
                request.getFeedback()
        );

        peerFeedbackRepository.save(peerFeedback);


        return PeerFeedbackDetailResponse.from(peerFeedback);
    }
}
