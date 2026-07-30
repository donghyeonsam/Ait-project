package com.aitserver.studySession.service;


import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.global.livekit.LiveKitRoomClient;
import com.aitserver.studySession.entity.StudySession;
import com.aitserver.studySession.entity.StudySessionParticipant;
import com.aitserver.studySession.repository.StudySessionParticipantRepository;
import com.aitserver.studySession.repository.StudySessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudySessionEndService {

    private final StudySessionRepository
            studySessionRepository;

    private final StudySessionParticipantRepository
            participantRepository;

    private final LiveKitRoomClient
            liveKitRoomClient;

    @Transactional
    public void endSession(
            Long sessionId,
            Long requesterUserId
    ) {
        StudySession studySession =
                studySessionRepository
                        .findForEnd(sessionId)
                        .orElseThrow(() ->
                                new BusinessException(
                                        ErrorCode
                                                .STUDY_SESSION_NOT_FOUND
                                )
                        );

        validateHost(
                studySession,
                requesterUserId
        );

        /*
         * 이미 DB상 ENDED이더라도 LiveKit 방이 남아 있을 수 있으므로
         * 방 삭제는 한 번 더 시도합니다.
         *
         * deleteRoomIfExists가 방 없음 상태를 정상 처리하므로
         * API를 멱등적으로 사용할 수 있습니다.
         */
        boolean roomDeleted =
                liveKitRoomClient
                        .deleteRoomIfExists(
                                studySession
                                        .getLiveKitRoomName()
                        );

        if (!studySession.isEnded()) {
            studySession.end();

            List<StudySessionParticipant> participants =
                    participantRepository
                            .findAllByStudySessionId(
                                    sessionId
                            );

            participants.forEach(
                    StudySessionParticipant
                            ::leaveBySessionEnd
            );
        }

        log.info(
                "화상 스터디 세션 종료 완료: "
                        + "sessionId={}, requesterUserId={}, "
                        + "roomDeleted={}",
                sessionId,
                requesterUserId,
                roomDeleted
        );
    }

    private void validateHost(
            StudySession studySession,
            Long requesterUserId
    ) {
        boolean isHost =
                studySession
                        .getStudyGroup()
                        .isOwner(requesterUserId);

        if (!isHost) {
            throw new BusinessException(
                    ErrorCode
                            .STUDY_SESSION_HOST_REQUIRED
            );
        }
    }
}