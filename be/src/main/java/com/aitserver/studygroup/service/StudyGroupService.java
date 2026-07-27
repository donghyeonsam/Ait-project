package com.aitserver.studygroup.service;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.studygroup.dto.GroupDetailResponse;
import com.aitserver.studygroup.dto.MyStudyGroupResponseDto;
import com.aitserver.studygroup.dto.StudyGroupListResponseDto;
import com.aitserver.studygroup.entity.StudyGroup;
import com.aitserver.studygroup.entity.StudyGroupMember;
import com.aitserver.studygroup.repository.StudyGroupMemberRepository;
import com.aitserver.studygroup.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyGroupService {

    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;

    public Page<StudyGroupListResponseDto> getStudyGroups(String status, String keyword, Pageable pageable) {
        Page<StudyGroup> studyGroups = studyGroupRepository.findByCondition(status, keyword, pageable);
        return studyGroups.map(StudyGroupListResponseDto::from);
    }

    // 1. 내 모든 스터디 그룹
    public List<MyStudyGroupResponseDto> getAllMyStudyGroups(Long userId) {
        List<StudyGroupMember> members = studyGroupMemberRepository.findAllMyStudyGroups(userId, "approved");

        return members.stream()
                .map(MyStudyGroupResponseDto::from)
                .collect(Collectors.toList());
    }

    // 2. 진행 중인(종료되지 않은) 내 스터디 그룹
    public List<MyStudyGroupResponseDto> getActiveMyStudyGroups(Long userId) {
        // 멤버 상태는 "approved" 이면서, 그룹 상태는 "completed"가 아닌 것
        List<StudyGroupMember> members = studyGroupMemberRepository.findActiveMyStudyGroups(userId, "approved", "completed");

        return members.stream()
                .map(MyStudyGroupResponseDto::from)
                .collect(Collectors.toList());
    }

    public GroupDetailResponse getGroupDetail(Long groupId, Long currentUserId) {
        // 1. 그룹 조회
        StudyGroup group = studyGroupRepository.findByIdWithMembers(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        // 2. 가입된 멤버인지 권한 검증
        boolean isMember = group.getMembers().stream()
                .anyMatch(member -> member.getUser().getId().equals(currentUserId)
                                && "approved".equals(member.getStatus()));

        if (!isMember) {
            throw new BusinessException(ErrorCode.GROUP_ACCESS_DENIED);
        }

        return GroupDetailResponse.from(group);
    }
}