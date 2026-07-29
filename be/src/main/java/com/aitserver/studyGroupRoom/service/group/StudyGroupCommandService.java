package com.aitserver.studyGroupRoom.service.group;

import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.studyGroupRoom.domain.StudyGroupStatus;
import com.aitserver.studyGroupRoom.dto.group.StudyGroupRequestDto;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.entity.StudyGroupMember;
import com.aitserver.studyGroupRoom.repository.StudyGroupMemberRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class StudyGroupCommandService {

    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final UserRepository userRepository;

    // 스터디 그룹 생성
    public Long createGroup(StudyGroupRequestDto.Create request, Long currentUserId) {
        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        // 1. 스터디 그룹 생성 (상태는 엔티티 생성자에서 'recruiting'으로 자동 설정됨)
        StudyGroup newGroup = StudyGroup.builder()
                .owner(user)
                .title(request.getTitle())
                .description(request.getDescription())
                .build();

        studyGroupRepository.save(newGroup);

        // 2. 방장을 승인된 멤버로 자동 추가
        StudyGroupMember ownerMember = StudyGroupMember.createOwner(newGroup, user);

        studyGroupMemberRepository.save(ownerMember);

        return newGroup.getId();
    }

    // 스터디 그룹 상태 변경
    public void updateGroupStatus(Long groupId, StudyGroupRequestDto.UpdateStatus request, Long currentUserId) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        // 방장 권한 체크
        if (!group.isOwner(currentUserId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_GROUP_ACTION);
        }

        // 변경하려는 상태가 recruiting인데 정원이 꽉 찬 경우 예외 처리
        if (request.getStatus() == StudyGroupStatus.RECRUITING &&
                group.getCurrentMemberCount() >= StudyGroup.MAX_CAPACITY) {
            throw new BusinessException(ErrorCode.GROUP_FULL_CANNOT_RECRUIT);
        }

        group.changeStatus(request.getStatus());
    }

    // 스터디 그룹 나가기 / 폭파
    @Transactional
    public void leaveOrDeleteGroup(Long groupId, Long currentUserId) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        if (group.isOwner(currentUserId)) {
            if (group.getCurrentMemberCount() > 1) {
                throw new BusinessException(ErrorCode.OWNER_CANNOT_LEAVE_WITH_MEMBERS);
            }
            StudyGroupMember ownerMember = studyGroupMemberRepository.findByStudyGroupIdAndUserId(groupId, currentUserId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_GROUP_MEMBER));

            ownerMember.leave();

            group.deleteGroup();
        } else {
            StudyGroupMember member = studyGroupMemberRepository.findByStudyGroupIdAndUserId(groupId, currentUserId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_GROUP_MEMBER));
            member.leave();
        }
    }

    public void kickMember(Long groupId, Long targetUserId, Long currentUserId) {

        // 1. 자기 자신을 추방하려고 하는지 확인
        if (currentUserId.equals(targetUserId)) {
            throw new BusinessException(ErrorCode.CANNOT_KICK_SELF);
        }

        // 2. 그룹 조회 및 방장 권한 확인
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        if (!group.isOwner(currentUserId)) {
            throw new BusinessException(ErrorCode.NOT_GROUP_OWNER);
        }

        // 3. 추방할 타겟 멤버가 실제 그룹에 있는지 확인
        StudyGroupMember targetMember = studyGroupMemberRepository.findByStudyGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_GROUP_MEMBER));

        // 4. 멤버 삭제 처리
        targetMember.kick();
    }
}
