package com.aitserver.studySession.service;


import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.global.livekit.LiveKitRoomClient;
import com.aitserver.studyGroupRoom.domain.StudyGroupMemberStatus;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.repository.StudyGroupMemberRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupRepository;
import com.aitserver.studySession.dto.StudySessionStatusResponse;
import com.aitserver.studySession.entity.StudySession;
import com.aitserver.studySession.domain.StudySessionStatus;
import com.aitserver.studySession.dto.StudySessionCreateResponse;
import com.aitserver.studySession.repository.StudySessionParticipantRepository;
import com.aitserver.studySession.repository.StudySessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StudySessionService {

    private static final EnumSet<StudySessionStatus>
            ACTIVE_SESSION_STATUSES = EnumSet.of(
            StudySessionStatus.WAITING,
            StudySessionStatus.IN_PROGRESS
    );

    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final StudySessionRepository studySessionRepository;
    private final LiveKitRoomClient liveKitRoomClient;
    private final StudySessionParticipantRepository studySessionParticipantRepository;

    /**
     * 그룹장이 새로운 화상 스터디 세션을 생성합니다.
     */
    @Transactional
    public StudySessionCreateResponse createSession(
            Long groupId,
            Long userId
    ) {
        /*
         * 동일 그룹에서 동시에 여러 세션이 생성되는 것을 막기 위해
         * StudyGroup 행을 PESSIMISTIC_WRITE로 조회합니다.
         */
        StudyGroup studyGroup =
                studyGroupRepository
                        .findForSessionCreation(groupId)
                        .orElseThrow(() ->
                                new BusinessException(
                                        ErrorCode.STUDY_GROUP_NOT_FOUND
                                )
                        );

        Optional<StudySession> activeSession =
                studySessionRepository
                        .findFirstByStudyGroupIdAndStatusInOrderByCreatedAtDesc(
                                groupId,
                                ACTIVE_SESSION_STATUSES
                        );

        /*
         * 이미 열린 방이 있으면 활성 그룹원에게 같은 세션을 반환합니다.
         * 새 방이 필요한 경우에만 그룹장 권한을 검사해 중복 생성과
         * 일반 그룹원의 입장 실패를 함께 방지합니다.
         */
        if (activeSession.isPresent()) {
            validateActiveMember(groupId, userId);
            return StudySessionCreateResponse.from(activeSession.get());
        }

        validateOwner(studyGroup, userId);

        String liveKitRoomName =
                generateLiveKitRoomName();

        boolean liveKitRoomCreated = false;

        try {
            /*
             * LiveKit에 최대 인원 8명인 방을 먼저 생성합니다.
             */
            liveKitRoomClient.createRoom(
                    liveKitRoomName,
                    StudySession.DEFAULT_MAX_PARTICIPANTS
            );

            liveKitRoomCreated = true;

            StudySession studySession =
                    StudySession.create(
                            studyGroup,
                            liveKitRoomName
                    );

            /*
             * save()가 아닌 saveAndFlush()를 사용해
             * DB 제약조건 오류를 현재 try 블록 안에서 확인합니다.
             */
            StudySession savedSession =
                    studySessionRepository.saveAndFlush(
                            studySession
                    );

            return StudySessionCreateResponse.from(
                    savedSession
            );

        } catch (RuntimeException exception) {
            /*
             * LiveKit 방은 만들어졌는데 DB 저장이 실패한 경우
             * 사용되지 않는 LiveKit 방이 남지 않도록 보상 삭제합니다.
             */
            if (liveKitRoomCreated) {
                deleteLiveKitRoomQuietly(
                        liveKitRoomName,
                        exception
                );
            }

            throw exception;
        }
    }

    private void validateOwner(
            StudyGroup studyGroup,
            Long userId
    ) {
        if (!studyGroup.isOwner(userId)) {
            throw new BusinessException(
                    ErrorCode.STUDY_GROUP_ACCESS_DENIED
            );
        }
    }

    private void validateActiveMember(Long groupId, Long userId) {
        boolean activeMember =
                studyGroupMemberRepository
                        .existsByStudyGroupIdAndUserIdAndStatus(
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

    private String generateLiveKitRoomName() {
        return "study-session-" + UUID.randomUUID();
    }

    private void deleteLiveKitRoomQuietly(
            String liveKitRoomName,
            RuntimeException originalException
    ) {
        try {
            liveKitRoomClient.deleteRoom(
                    liveKitRoomName
            );

        } catch (RuntimeException cleanupException) {
            /*
             * 원래 발생한 예외를 유지하면서
             * LiveKit 정리 실패 정보도 함께 남깁니다.
             */
            originalException.addSuppressed(
                    cleanupException
            );
        }
    }


    @Transactional(readOnly = true)
    public StudySessionStatusResponse getStatus(
            Long sessionId,
            Long userId
    ) {
        StudySession studySession =
                studySessionRepository
                        .findById(sessionId)
                        .orElseThrow(() ->
                                new BusinessException(
                                        ErrorCode.STUDY_SESSION_NOT_FOUND
                                )
                        );

        boolean participated =
                studySessionParticipantRepository
                        .existsByStudySessionIdAndUserId(
                                sessionId,
                                userId
                        );

        if (!participated) {
            throw new BusinessException(
                    ErrorCode.STUDY_SESSION_STATUS_ACCESS_DENIED
            );
        }

        return StudySessionStatusResponse.from(
                studySession
        );
    }
}