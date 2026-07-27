package com.aitserver.studyGroupRoom.service;



import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.domain.StudyGroupMemberStatus;
import com.aitserver.studyGroupRoom.repository.StudyGroupMemberRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class StudyGroupAccessValidator {

    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository memberRepository;

    @Transactional(readOnly = true)
    public StudyGroup requireGroup(
            Long groupId
    ) {
        StudyGroup studyGroup =
                studyGroupRepository
                        .findByIdAndDeletedAtIsNull(groupId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "스터디 그룹을 찾을 수 없습니다."
                                )
                        );

        if (studyGroup.isClosed()) {
            throw new IllegalStateException(
                    "종료된 스터디 그룹입니다."
            );
        }

        return studyGroup;
    }

    @Transactional(readOnly = true)
    public StudyGroup requireOwner(
            Long groupId,
            Long userId
    ) {
        StudyGroup studyGroup = requireGroup(groupId);

        if (!studyGroup.isOwner(userId)) {
            throw new IllegalStateException(
                    "그룹장만 사용할 수 있는 기능입니다."
            );
        }

        return studyGroup;
    }

    @Transactional(readOnly = true)
    public StudyGroup requireActiveMember(
            Long groupId,
            Long userId
    ) {
        StudyGroup studyGroup = requireGroup(groupId);

        boolean isActiveMember =
                memberRepository
                        .existsByStudyGroupIdAndUserIdAndStatusAndDeletedAtIsNull(
                                groupId,
                                userId,
                                StudyGroupMemberStatus.ACTIVE
                        );

        if (!isActiveMember) {
            throw new IllegalStateException(
                    "해당 스터디 그룹의 멤버가 아닙니다."
            );
        }

        return studyGroup;
    }
}
