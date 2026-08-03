package com.aitserver.studySession.service;


import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.repository.StudyGroupMemberRepository;
import com.aitserver.studySession.entity.StudySession;
import com.aitserver.studySession.entity.StudySessionParticipant;
import com.aitserver.studySession.domain.StudySessionParticipantRole;
import com.aitserver.studySession.dto.StudySessionParticipantJoinRequest;
import com.aitserver.studySession.repository.StudySessionParticipantRepository;
import com.aitserver.studySession.repository.StudySessionRepository;
import com.aitserver.user.entity.User;
import com.aitserver.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StudySessionParticipantJoinService {

    private final StudySessionRepository
            studySessionRepository;

    private final StudySessionParticipantRepository
            participantRepository;

    private final StudyGroupMemberRepository
            groupMemberRepository;

    private final UserRepository
            userRepository;

    @Transactional
    public void join(
            Long sessionId,
            Long userId,
            StudySessionParticipantJoinRequest request
    ) {
        StudySession studySession =
                studySessionRepository
                        .findForConnection(sessionId)
                        .orElseThrow(() ->
                                new BusinessException(
                                        ErrorCode.STUDY_SESSION_NOT_FOUND
                                )
                        );

        if (!studySession.isJoinable()) {
            throw new BusinessException(
                    ErrorCode.STUDY_SESSION_ENDED
            );
        }

        StudyGroup studyGroup =
                studySession.getStudyGroup();

//        boolean activeMember =
//                groupMemberRepository
//                        .existsByStudyGroupIdAndUserIdAndStatusAndDeletedAtIsNull(
//                                studyGroup.getId(),
//                                userId,
//                                StudyGroupMemberStatus.ACTIVE
//                        );
//
//        if (!activeMember) {
//            throw new BusinessException(
//                    ErrorCode.STUDY_SESSION_ACCESS_DENIED
//            );
//        }

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new BusinessException(
                                ErrorCode.USER_NOT_FOUND
                        )
                );

        StudySessionParticipantRole role =
                studyGroup.isOwner(userId)
                        ? StudySessionParticipantRole.HOST
                        : StudySessionParticipantRole.MEMBER;

        StudySessionParticipant participant =
                participantRepository
                        .findByStudySessionIdAndUserId(
                                sessionId,
                                userId
                        )
                        .orElse(null);

        if (participant == null) {
            participant =
                    StudySessionParticipant.connect(
                            studySession,
                            user,
                            role,
                            request.resumeId(),
                            request.coverLetterId()
                    );
        } else {
            if (participant.isKicked()) {
                throw new BusinessException(
                        ErrorCode
                                .STUDY_SESSION_PARTICIPANT_KICKED
                );
            }

            participant.reconnect(
                    role,
                    request.resumeId(),
                    request.coverLetterId()
            );
        }

        participantRepository.save(participant);
    }
}
