package com.aitserver.peerFeedback.service;


import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.peerFeedback.dto.*;
import com.aitserver.peerFeedback.entity.AiPeerSummary;
import com.aitserver.peerFeedback.entity.PeerFeedback;
import com.aitserver.peerFeedback.repository.AiPeerSummaryRepository;
import com.aitserver.peerFeedback.repository.PeerFeedbackRepository;
import com.aitserver.studySession.entity.StudySession;
import com.aitserver.studySession.repository.StudySessionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class PeerFeedbackServiceImpl implements PeerFeedbackService{
    private final PeerFeedbackRepository peerFeedbackRepository;
    private final StudySessionRepository studySessionRepository;
    private final AiPeerSummaryRepository aiPeerSummaryRepository;

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
    public PeerFeedbackReceiveResponse getPeerFeedbackReceiveList(
            Long userId,
            Long sessionId
    ) {
        List<PeerFeedback> list = peerFeedbackRepository.findAllByStudySessionIdAndEvaluateeId(sessionId, userId);

        List<PeerFeedbackDetailResponse> responseList =
                list.stream()
                        .map(PeerFeedbackDetailResponse::from)
                        .toList();

        AiPeerSummary aiPeerSummary = aiPeerSummaryRepository.findByStudySessionIdAndEvaluateeId(sessionId, userId);

        return PeerFeedbackReceiveResponse.builder()
                .aiSummary(
                        aiPeerSummary != null
                                ? aiPeerSummary.getContent()
                                : null
                )
                .details(responseList)
                .build();
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

    @Override
    @Transactional
    public PeerFeedbackDetailResponse updatePeerFeedback(PeerFeedbackUpdateRequest request, Long userId, Long peerFeedbackId) {
        PeerFeedback peerFeedback = peerFeedbackRepository.findById(peerFeedbackId)
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.PEER_FEEDBACK_NOT_FOUND)
                );

        // 요청한 평가의 작성자가 요청한 userId와 다를 경우
        if (!Objects.equals(peerFeedback.getEvaluatorId(), userId)) {
            throw new BusinessException(ErrorCode.PEER_FEEDBACK_ACCESS_DENIED);
        }

        // dto 하나씩 검사하고 null이 아니면 교체?
        if (request.getLogicalScore() != null) {
            peerFeedback.setLogicalScore(request.getLogicalScore());
        }
        if (request.getCommunicationScore() != null) {
            peerFeedback.setCommunicationScore(request.getCommunicationScore());
        }
        if (request.getAttitudeScore() != null) {
            peerFeedback.setAttitudeScore(request.getAttitudeScore());
        }
        if (request.getJobCompetencyScore() != null) {
            peerFeedback.setJobCompetencyScore(request.getJobCompetencyScore());
        }
        if (request.getConfidenceScore() != null) {
            peerFeedback.setConfidenceScore(request.getConfidenceScore());
        }
        if (request.getFeedback() != null) {
            peerFeedback.setFeedback(request.getFeedback());
        }

        return PeerFeedbackDetailResponse.from(peerFeedback);
    }

    // 내가 참여했던 세션별 리스트
    @Override
    @Transactional
    public List<PeerFeedbackListResponse> getPeerFeedbackList(
            Long userId
    ) {
        // 1. 내가 받은 모든 상호평가 조회
        List<PeerFeedback> feedbackList = peerFeedbackRepository.findAllByEvaluateeId(userId);

        if (feedbackList.isEmpty()) {
            return List.of();
        }

        // 2. sessionId별로 상호평가 그룹화
        Map<Long, List<PeerFeedback>> feedbacksBySession = new HashMap<>();

        for (PeerFeedback feedback : feedbackList) {
            Long sessionId = feedback.getStudySession().getId();

            List<PeerFeedback> sessionFeedbackList =
                    feedbacksBySession.get(sessionId);

            if (sessionFeedbackList == null) {
                sessionFeedbackList = new ArrayList<>();
                feedbacksBySession.put(
                        sessionId,
                        sessionFeedbackList
                );
            }

            sessionFeedbackList.add(feedback);
        }

        // 3. 조회할 sessionId 목록 만들기
        List<Long> sessionIds = new ArrayList<>();

        for (Long sessionId : feedbacksBySession.keySet()) {
            sessionIds.add(sessionId);
        }

        // 4. 필요한 세션들을 한 번에 조회
        List<StudySession> studySessions =
                studySessionRepository.findAllById(sessionIds);

        // 5. sessionId를 Key로 갖는 Map으로 변환
        Map<Long, StudySession> sessionMap = new HashMap<>();

        for (StudySession studySession : studySessions) {
            sessionMap.put(
                    studySession.getId(),
                    studySession
            );
        }

        // 6. 응답 객체 생성
        List<PeerFeedbackListResponse> responseList = new ArrayList<>();

        for (Map.Entry<Long, List<PeerFeedback>> entry : feedbacksBySession.entrySet()) {
            Long sessionId = entry.getKey();

            List<PeerFeedback> sessionFeedbacks = entry.getValue();

            StudySession studySession = sessionMap.get(sessionId);

            if (studySession == null) {
                throw new BusinessException(ErrorCode.STUDY_SESSION_NOT_FOUND);
            }

            double scoreAvg = calculateScoreAverage(sessionFeedbacks);

            String sessionTitle = studySession.getStudyGroup().getTitle();

            PeerFeedbackListResponse response =
                    PeerFeedbackListResponse.builder()
                            .sessionId(sessionId)
                            .createdAt(
                                    studySession.getCreatedAt()
                            )
                            .sessionTitle(sessionTitle)
                            .scoreAvg(scoreAvg)
                            .build();

            responseList.add(response);
        }

        // 7. 최신 세션 순서로 정렬
        responseList.sort(Comparator.comparing(PeerFeedbackListResponse::getCreatedAt).reversed()
        );

        return responseList;
    }

    // 평균 계산용 메서드
    private double calculateScoreAverage(
            List<PeerFeedback> feedbackList
    ) {
        if (feedbackList.isEmpty()) {
            return 0.0;
        }

        int totalScore = 0;

        for (PeerFeedback feedback : feedbackList) {
            totalScore += feedback.getLogicalScore();
            totalScore += feedback.getCommunicationScore();
            totalScore += feedback.getAttitudeScore();
            totalScore += feedback.getJobCompetencyScore();
            totalScore += feedback.getConfidenceScore();
        }

        int feedbackCount = feedbackList.size();
        int scoreCount = feedbackCount * 5;

        double average =
                (double) totalScore / scoreCount;

        // 소수점 첫째 자리까지 반올림
        double roundedAverage =
                Math.round(average * 10.0) / 10.0;

        return roundedAverage;
    }
}
