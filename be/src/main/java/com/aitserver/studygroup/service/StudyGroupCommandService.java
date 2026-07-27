package com.aitserver.studygroup.service;

import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.studygroup.dto.StudyGroupRequestDto;
import com.aitserver.studygroup.entity.StudyGroup;
import com.aitserver.studygroup.entity.StudyGroupMember;
import com.aitserver.studygroup.repository.StudyGroupMemberRepository;
import com.aitserver.studygroup.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

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
                .ownerId(currentUserId)
                .title(request.getTitle())
                .description(request.getDescription())
                .capacity(request.getCapacity())
                .build();

        studyGroupRepository.save(newGroup);

        // 2. 방장을 승인된 멤버로 자동 추가
        StudyGroupMember ownerMember = StudyGroupMember.builder()
                .studyGroup(newGroup)
                .user(user)
                .status("approved")
                .message("스터디 개설자")
                .joinedAt(LocalDateTime.now())
                .build();

        studyGroupMemberRepository.save(ownerMember);

        return newGroup.getId();
    }

    // 스터디 그룹 상태 변경
    public void updateGroupStatus(Long groupId, StudyGroupRequestDto.UpdateStatus request, Long currentUserId) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        // 방장 권한 체크
        if (!group.getOwnerId().equals(currentUserId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_GROUP_ACTION);
        }

        // 변경하려는 상태가 recruiting인데 정원이 꽉 찬 경우 예외 처리
        if ("recruiting".equals(request.getStatus()) && group.getCurrentMemberCount() >= group.getCapacity()) {
            throw new BusinessException(ErrorCode.GROUP_FULL_CANNOT_RECRUIT);
        }

        group.changeStatus(request.getStatus());
    }

    // 스터디 그룹 나가기 / 폭파
    @Transactional
    public void leaveOrDeleteGroup(Long groupId, Long currentUserId) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        if (group.getOwnerId().equals(currentUserId)) {
            // 방장인 경우: 혼자 남았을 때만 그룹 폭파 가능
            if (group.getCurrentMemberCount() > 1) {
                // 자신 외에 다른 멤버가 존재하면 예외 발생
                throw new BusinessException(ErrorCode.OWNER_CANNOT_LEAVE_WITH_MEMBERS);
            }

            // 방장 혼자만 남은 경우 스터디 그룹 삭제(폭파)
            studyGroupRepository.delete(group);
            log.info("방장(ID: {})이 혼자 남아 그룹(ID: {})이 삭제(Soft Delete) 되었습니다.", currentUserId, groupId);
        } else {
            // 일반 멤버인 경우: 본인의 멤버 데이터만 삭제
            StudyGroupMember member = studyGroupMemberRepository.findByStudyGroupIdAndUserId(groupId, currentUserId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.NOT_GROUP_MEMBER));

            studyGroupMemberRepository.delete(member);
            log.info("멤버(ID: {})가 그룹(ID: {})에서 나갔습니다.", currentUserId, groupId);
        }
    }
}
