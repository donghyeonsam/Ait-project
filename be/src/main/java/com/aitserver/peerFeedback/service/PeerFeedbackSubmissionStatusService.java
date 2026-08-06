package com.aitserver.peerFeedback.service;



import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.peerFeedback.entity.PeerFeedback;
import com.aitserver.peerFeedback.repository.PeerFeedbackRepository;
import com.aitserver.studySession.entity.StudySessionParticipant;
import com.aitserver.studySession.domain.StudySessionParticipantStatus;
import com.aitserver.peerFeedback.dto.PeerFeedbackSubmissionStatusResponse;
import com.aitserver.studySession.repository.StudySessionParticipantRepository;
import com.aitserver.studySession.repository.StudySessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PeerFeedbackSubmissionStatusService {

    private final StudySessionRepository studySessionRepository;
    private final StudySessionParticipantRepository participantRepository;
    private final PeerFeedbackRepository peerFeedbackRepository;

    public PeerFeedbackSubmissionStatusResponse getSubmissionStatus(
            Long sessionId
    ) {
        // 존재하지 않는 세션인지 먼저 확인
        if (!studySessionRepository.existsById(sessionId)) {
            throw new BusinessException(ErrorCode.STUDY_SESSION_NOT_FOUND);
        }

        /*
         * 실제로 세션에 참여했던 사용자만 평가 대상에 포함합니다.
         *
         * JOINED: 현재 참여 중
         * LEFT: 세션에 참여했다가 정상적으로 퇴장
         *
         * CONNECTING, KICKED는 제외합니다.
         */
        Set<StudySessionParticipantStatus> eligibleStatuses =
                EnumSet.of(
                        StudySessionParticipantStatus.JOINED,
                        StudySessionParticipantStatus.LEFT
                );

        List<StudySessionParticipant> participantList =
                participantRepository
                        .findAllByStudySession_IdAndStatusInOrderByFirstJoinedAtAsc(
                                sessionId,
                                eligibleStatuses
                        );

        /*
         * 사용자 ID를 기준으로 참여자를 중복 제거합니다.
         *
         * 재접속 과정에서 동일 사용자의 participant 데이터가
         * 여러 개 존재하는 상황도 방어할 수 있습니다.
         */
        Map<Long, StudySessionParticipant> participantByUserId =
                new LinkedHashMap<>();

        for (StudySessionParticipant participant : participantList) {
            Long userId = participant.getUser().getId();

            participantByUserId.putIfAbsent(
                    userId,
                    participant
            );
        }

        Set<Long> participantUserIds =
                new HashSet<>(participantByUserId.keySet());

        /*
         * 참여자가 없거나 한 명뿐이라면 작성해야 할 상호평가가 없습니다.
         */
        if (participantUserIds.size() <= 1) {
            return PeerFeedbackSubmissionStatusResponse.builder()
                    .allSubmitted(true)
                    .incompleteUserNicknames(List.of())
                    .build();
        }

        List<PeerFeedback> feedbackList =
                peerFeedbackRepository.findAllByStudySessionId(sessionId);

        /*
         * evaluatorId별로 평가를 작성한 evaluateeId들을 저장합니다.
         *
         * 예:
         * 1번 사용자 -> [2, 3, 4]
         * 2번 사용자 -> [1, 3]
         */
        Map<Long, Set<Long>> submittedEvaluateeIdsByEvaluator =
                new HashMap<>();

        for (PeerFeedback feedback : feedbackList) {
            Long evaluatorId = feedback.getEvaluatorId();
            Long evaluateeId = feedback.getEvaluateeId();

            // 현재 세션 참여자가 작성한 평가가 아니면 제외
            if (!participantUserIds.contains(evaluatorId)) {
                continue;
            }

            // 현재 세션 참여자에게 작성한 평가가 아니면 제외
            if (!participantUserIds.contains(evaluateeId)) {
                continue;
            }

            // 자기 자신에게 작성한 평가는 제외
            if (evaluatorId.equals(evaluateeId)) {
                continue;
            }

            submittedEvaluateeIdsByEvaluator
                    .computeIfAbsent(
                            evaluatorId,
                            key -> new HashSet<>()
                    )
                    .add(evaluateeId);
        }

        int requiredFeedbackCount =
                participantUserIds.size() - 1;

        List<String> incompleteUserNicknames =
                new ArrayList<>();

        for (Map.Entry<Long, StudySessionParticipant> entry
                : participantByUserId.entrySet()) {

            Long evaluatorId = entry.getKey();
            StudySessionParticipant participant = entry.getValue();

            Set<Long> submittedEvaluateeIds =
                    submittedEvaluateeIdsByEvaluator.getOrDefault(
                            evaluatorId,
                            Set.of()
                    );

            /*
             * 참여자가 4명이라면 본인을 제외한 3명에게
             * 평가를 작성해야 완료입니다.
             */
            if (submittedEvaluateeIds.size()
                    < requiredFeedbackCount) {

                incompleteUserNicknames.add(
                        participant.getUser().getNickname()
                );
            }
        }

        return PeerFeedbackSubmissionStatusResponse.builder()
                .allSubmitted(incompleteUserNicknames.isEmpty())
                .incompleteUserNicknames(incompleteUserNicknames)
                .build();
    }
}