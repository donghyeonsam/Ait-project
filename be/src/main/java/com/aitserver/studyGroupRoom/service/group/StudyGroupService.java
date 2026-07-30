package com.aitserver.studyGroupRoom.service.group;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.studyGroupRoom.domain.StudyGroupMemberStatus;
import com.aitserver.studyGroupRoom.domain.StudyGroupStatus;
import com.aitserver.studyGroupRoom.dto.group.GroupDetailResponse;
import com.aitserver.studyGroupRoom.dto.group.MyStudyGroupResponseDto;
import com.aitserver.studyGroupRoom.dto.group.StudyGroupListResponseDto;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.entity.StudyGroupMember;
import com.aitserver.studyGroupRoom.repository.StudyGroupMemberRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

    @Transactional(readOnly = true)
    public Page<StudyGroupListResponseDto> getStudyGroups(
            StudyGroupStatus status, String keyword, String sortBy, Long userId, Pageable pageable) {

        String statusString = (status != null) ? status.name() : null;

        List<String> excludedStatuses = List.of(
                StudyGroupMemberStatus.ACTIVE.name(),
                StudyGroupMemberStatus.KICKED.name(),
                StudyGroupMemberStatus.PENDING.name()
        );

        Sort sort = "oldest".equalsIgnoreCase(sortBy)
                ? Sort.by(Sort.Direction.ASC, "created_at")
                : Sort.by(Sort.Direction.DESC, "created_at");

        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);

        Page<StudyGroup> studyGroups = studyGroupRepository.findByConditionAndUserStatus(
                statusString, keyword, userId, excludedStatuses, sortedPageable
        );

        return studyGroups.map(StudyGroupListResponseDto::from);
    }

    // 1. 내 모든 스터디 그룹
    public List<MyStudyGroupResponseDto> getAllMyStudyGroups(Long userId) {
        List<StudyGroupMember> members = studyGroupMemberRepository.findAllMyStudyGroups(userId, StudyGroupMemberStatus.ACTIVE);

        return members.stream()
                .map(MyStudyGroupResponseDto::from)
                .collect(Collectors.toList());
    }

    // 2. 진행 중인(종료되지 않은) 내 스터디 그룹
    public List<MyStudyGroupResponseDto> getActiveMyStudyGroups(Long userId) {
        // 멤버 상태는 "active" 이면서, 그룹 상태는 "closed"가 아닌 것
        List<StudyGroupMember> members = studyGroupMemberRepository.findActiveMyStudyGroups(
                userId,
                StudyGroupMemberStatus.ACTIVE,
                StudyGroupStatus.CLOSED
        );

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
                        && member.isActive());

        if (!isMember) {
            throw new BusinessException(ErrorCode.GROUP_ACCESS_DENIED);
        }

        return GroupDetailResponse.from(group);
    }
}