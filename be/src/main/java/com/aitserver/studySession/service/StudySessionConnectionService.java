package com.aitserver.studySession.service;



import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.global.livekit.LiveKitProperties;
import com.aitserver.global.livekit.LiveKitRoomClient;
import com.aitserver.global.livekit.service.LiveKitTokenService;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.domain.StudyGroupMemberStatus;
import com.aitserver.studyGroupRoom.repository.StudyGroupMemberRepository;
import com.aitserver.studySession.entity.StudySession;
import com.aitserver.studySession.domain.StudySessionParticipantRole;
import com.aitserver.studySession.domain.StudySessionParticipantStatus;
import com.aitserver.studySession.dto.StudySessionConnectionResponse;
import com.aitserver.studySession.repository.StudySessionParticipantRepository;
import com.aitserver.studySession.repository.StudySessionRepository;
import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import livekit.LivekitModels;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudySessionConnectionService {

    private final StudySessionRepository studySessionRepository;
    private final StudySessionParticipantRepository
            participantRepository;
    private final StudyGroupMemberRepository
            groupMemberRepository;
    private final UserRepository userRepository;

    private final LiveKitRoomClient liveKitRoomClient;
    private final LiveKitTokenService liveKitTokenService;
    private final LiveKitProperties liveKitProperties;

    @Transactional(readOnly = true)
    public StudySessionConnectionResponse createConnection(
            Long sessionId,
            Long userId
    ) {
        StudySession studySession =
                studySessionRepository
                        .findForConnection(sessionId)
                        .orElseThrow(() ->
                                new BusinessException(
                                        ErrorCode.STUDY_SESSION_NOT_FOUND
                                )
                        );

        validateSessionJoinable(studySession);

        StudyGroup studyGroup =
                studySession.getStudyGroup();

        validateActiveGroupMember(
                studyGroup.getId(),
                userId
        );

        validateNotKicked(
                sessionId,
                userId
        );

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new BusinessException(
                                ErrorCode.USER_NOT_FOUND
                        )
                );

        StudySessionParticipantRole role =
                determineRole(
                        studyGroup,
                        userId
                );

        String participantIdentity =
                liveKitTokenService
                        .createParticipantIdentity(userId);

        validateRoomCapacity(
                studySession,
                participantIdentity
        );

        String participantName =
                user.getNickname();

        String participantToken =
                liveKitTokenService
                        .createParticipantToken(
                                studySession.getId(),
                                studySession.getLiveKitRoomName(),
                                userId,
                                participantName,
                                role
                        );

        /*
         * 여기서는 참가자 DB 상태를 JOINED로 변경하지 않습니다.
         *
         * 토큰을 발급받았다고 실제 LiveKit 방에 접속한 것은 아니므로,
         * 실제 입장 처리는 다음 단계의 participant_joined
         * Webhook을 기준으로 수행합니다.
         */
        return new StudySessionConnectionResponse(
                studySession.getId(),
                studyGroup.getId(),
                studySession.getLiveKitRoomName(),
                liveKitProperties.wsUrl(),
                participantToken,
                participantIdentity,
                participantName,
                role
        );
    }

    private void validateSessionJoinable(
            StudySession studySession
    ) {
        if (!studySession.isJoinable()) {
            throw new BusinessException(
                    ErrorCode.STUDY_SESSION_ENDED
            );
        }
    }

    private void validateActiveGroupMember(
            Long groupId,
            Long userId
    ) {
        boolean activeMember =
                groupMemberRepository
                        .existsByStudyGroupIdAndUserIdAndStatusAndDeletedAtIsNull(
                                groupId,
                                userId,
                                StudyGroupMemberStatus.ACTIVE
                        );

        if (!activeMember) {
            throw new BusinessException(
                    ErrorCode.STUDY_SESSION_ACCESS_DENIED
            );
        }
    }

    private void validateNotKicked(
            Long sessionId,
            Long userId
    ) {
        boolean kicked =
                participantRepository
                        .existsByStudySessionIdAndUserIdAndStatus(
                                sessionId,
                                userId,
                                StudySessionParticipantStatus.KICKED
                        );

        if (kicked) {
            throw new BusinessException(
                    ErrorCode.STUDY_SESSION_PARTICIPANT_KICKED
            );
        }
    }

    private StudySessionParticipantRole determineRole(
            StudyGroup studyGroup,
            Long userId
    ) {
        return studyGroup.isOwner(userId)
                ? StudySessionParticipantRole.HOST
                : StudySessionParticipantRole.MEMBER;
    }

    private void validateRoomCapacity(
            StudySession studySession,
            String participantIdentity
    ) {
        List<LivekitModels.ParticipantInfo> participants =
                liveKitRoomClient.listParticipants(
                        studySession.getLiveKitRoomName()
                );

        /*
         * 같은 사용자가 이미 접속해 있다면 새 연결이 기존 연결을
         * 대체하므로 참가자 수가 늘어나는 것으로 판단하지 않습니다.
         */
        boolean alreadyConnected =
                participants.stream()
                        .anyMatch(participant ->
                                participantIdentity.equals(
                                        participant.getIdentity()
                                )
                        );

        if (!alreadyConnected
                && participants.size()
                >= studySession.getMaxParticipants()) {
            throw new BusinessException(
                    ErrorCode.STUDY_SESSION_FULL
            );
        }
    }
}