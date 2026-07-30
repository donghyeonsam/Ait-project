package com.aitserver.studySession.service;


import com.aitserver.coverletter.dto.CoverLetterDetailResponse;
import com.aitserver.coverletter.entity.CoverLetter;
import com.aitserver.coverletter.repository.CoverLetterRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.global.livekit.LiveKitRoomClient;
import com.aitserver.global.livekit.service.LiveKitTokenService;
import com.aitserver.studySession.dto.MemberResponse;
import com.aitserver.studySession.entity.StudySession;
import com.aitserver.studySession.entity.StudySessionParticipant;
import com.aitserver.studySession.repository.StudySessionParticipantRepository;
import com.aitserver.studySession.repository.StudySessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.aitserver.studySession.domain.StudySessionParticipantStatus.JOINED;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudySessionParticipantService {

    private final StudySessionRepository studySessionRepository;

    private final StudySessionParticipantRepository participantRepository;

    private final LiveKitRoomClient liveKitRoomClient;

    private final LiveKitTokenService liveKitTokenService;

    private final CoverLetterRepository coverLetterRepository;


    @Transactional
    public void kickParticipant(
            Long sessionId,
            Long targetUserId,
            Long requesterUserId
    ) {
        StudySession studySession =
                studySessionRepository
                        .findForConnection(sessionId)
                        .orElseThrow(() ->
                                new BusinessException(
                                        ErrorCode.STUDY_SESSION_NOT_FOUND
                                )
                        );

        validateSessionNotEnded(studySession);
        validateRequesterIsHost(
                studySession,
                requesterUserId
        );
        validateNotSelfKick(
                requesterUserId,
                targetUserId
        );

        StudySessionParticipant participant =
                participantRepository
                        .findForKick(
                                sessionId,
                                targetUserId
                        )
                        .orElseThrow(() ->
                                new BusinessException(
                                        ErrorCode
                                                .STUDY_SESSION_PARTICIPANT_NOT_FOUND
                                )
                        );

        /*
         * 이미 강퇴된 참가자라면 멱등하게 성공 처리합니다.
         */
        if (participant.isKicked()) {
            return;
        }

        /*
         * 먼저 DB 상태를 KICKED로 바꿉니다.
         * 이후 connection API에서 새 토큰 발급이 차단됩니다.
         */
        participant.kick();
        participantRepository.saveAndFlush(participant);

        String participantIdentity =
                liveKitTokenService
                        .createParticipantIdentity(
                                targetUserId
                        );

        boolean disconnected =
                liveKitRoomClient
                        .removeParticipantIfConnected(
                                studySession
                                        .getLiveKitRoomName(),
                                participantIdentity
                        );

        log.info(
                "화상 스터디 참가자 강퇴 완료: "
                        + "sessionId={}, requesterUserId={}, "
                        + "targetUserId={}, disconnected={}",
                sessionId,
                requesterUserId,
                targetUserId,
                disconnected
        );
    }

    private void validateSessionNotEnded(
            StudySession studySession
    ) {
        if (studySession.isEnded()) {
            throw new BusinessException(
                    ErrorCode.STUDY_SESSION_ENDED
            );
        }
    }

    private void validateRequesterIsHost(
            StudySession studySession,
            Long requesterUserId
    ) {
        boolean isHost =
                studySession
                        .getStudyGroup()
                        .isOwner(requesterUserId);

        if (!isHost) {
            throw new BusinessException(
                    ErrorCode.STUDY_SESSION_HOST_REQUIRED
            );
        }
    }

    private void validateNotSelfKick(
            Long requesterUserId,
            Long targetUserId
    ) {
        if (requesterUserId.equals(targetUserId)) {
            throw new BusinessException(
                    ErrorCode.STUDY_SESSION_CANNOT_KICK_SELF
            );
        }
    }



    public List<MemberResponse> getMemberList(
            Long sessionId,
            Long userId
    ) {
        validateSession(sessionId);
        validateParticipant(sessionId, userId);

        return participantRepository
                .findAllByStudySessionIdAndStatusOrderByFirstJoinedAtAsc(
                        sessionId,
                        JOINED
                )
                .stream()
                .map(MemberResponse::from)
                .toList();
    }

    private void validateSession(Long sessionId) {
        if (!studySessionRepository.existsById(sessionId)) {
            throw new BusinessException(
                    ErrorCode.STUDY_SESSION_NOT_FOUND
            );
        }
    }

    private void validateParticipant(
            Long sessionId,
            Long userId
    ) {
        boolean isParticipant =
                participantRepository
                        .existsByStudySessionIdAndUserIdAndStatus(
                                sessionId,
                                userId,
                                JOINED
                        );

        if (!isParticipant) {
            throw new BusinessException(
                    ErrorCode.STUDY_SESSION_ACCESS_DENIED
            );
        }
    }

    // 권한 검사 없이 자소서 조회
    public CoverLetterDetailResponse getCoverLetter(Long coverLetterId){
        CoverLetter coverLetter = coverLetterRepository.findById(coverLetterId)
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.COVER_LETTER_NOT_FOUND)
                );

        return CoverLetterDetailResponse.from(coverLetter);
    }
}