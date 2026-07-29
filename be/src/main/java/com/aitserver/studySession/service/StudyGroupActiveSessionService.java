package com.aitserver.studySession.service;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.studyGroupRoom.domain.StudyGroupMemberStatus;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.repository.StudyGroupMemberRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupRepository;
import com.aitserver.studySession.domain.StudySessionStatus;
import com.aitserver.studySession.dto.StudyGroupActiveSessionResponse;
import com.aitserver.studySession.entity.StudySession;
import com.aitserver.studySession.repository.StudySessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StudyGroupActiveSessionService {

    private final StudyGroupRepository studyGroupRepository;

    private final StudyGroupMemberRepository
            studyGroupMemberRepository;

    private final StudySessionRepository
            studySessionRepository;

    @Transactional(readOnly = true)
    public StudyGroupActiveSessionResponse getActiveSession(
            Long groupId,
            Long userId
    ) {
        StudyGroup studyGroup =
                studyGroupRepository
                        .findByIdAndDeletedAtIsNull(groupId)
                        .orElseThrow(() ->
                                new BusinessException(
                                        ErrorCode.STUDY_GROUP_NOT_FOUND
                                )
                        );

        validateGroupMember(
                studyGroup,
                userId
        );

        StudySession activeSession =
                studySessionRepository
                        .findFirstByStudyGroupIdAndStatusOrderByCreatedAtDesc(
                                groupId,
                                StudySessionStatus.IN_PROGRESS
                        )
                        .orElse(null);

        if (activeSession == null) {
            return StudyGroupActiveSessionResponse
                    .notExists();
        }

        return StudyGroupActiveSessionResponse.exists(
                activeSession.getId()
        );
    }

    private void validateGroupMember(
            StudyGroup studyGroup,
            Long userId
    ) {
        if (studyGroup.isOwner(userId)) {
            return;
        }

        boolean activeMember =
                studyGroupMemberRepository
                        .existsByStudyGroupIdAndUserIdAndStatusAndDeletedAtIsNull(
                                studyGroup.getId(),
                                userId,
                                StudyGroupMemberStatus.ACTIVE
                        );

        if (!activeMember) {
            throw new BusinessException(
                    ErrorCode.STUDY_GROUP_ACCESS_DENIED
            );
        }
    }
}
