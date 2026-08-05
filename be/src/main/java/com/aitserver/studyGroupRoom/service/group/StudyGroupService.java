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
import java.util.Set;
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

        // 1. 상태값 문자열 변환
        String statusString = (status != null) ? status.name() : null;

        // 2. PENDING을 제외 목록에서 제거 (대기 중인 그룹도 화면에 나오게 하기 위함)
        List<String> excludedStatuses = List.of(
                StudyGroupMemberStatus.ACTIVE.name(),
                StudyGroupMemberStatus.KICKED.name()
        );

        // 3. 정렬 및 페이징 객체 생성
        Sort sort = "oldest".equalsIgnoreCase(sortBy)
                ? Sort.by(Sort.Direction.ASC, "created_at")
                : Sort.by(Sort.Direction.DESC, "created_at");

        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), sort);

        // 4. DB에서 조건에 맞는 스터디 그룹 목록 조회
        Page<StudyGroup> studyGroups = studyGroupRepository.findByConditionAndUserStatus(
                statusString, keyword, userId, excludedStatuses, sortedPageable
        );

        // 조회된 결과가 없으면 추가 쿼리 없이 바로 빈 페이지 반환 (성능 최적화)
        if (studyGroups.isEmpty()) {
            return studyGroups.map(group -> StudyGroupListResponseDto.of(group, false));
        }

        // 5. 현재 조회된 페이지의 스터디 그룹 ID들만 추출
        List<Long> groupIds = studyGroups.getContent().stream()
                .map(StudyGroup::getId)
                .toList();

        // 6. 추출한 그룹 ID들 중에서 현재 유저가 '대기중(PENDING)'인 그룹 ID만 가져오기
        Set<Long> pendingGroupIds = studyGroupMemberRepository.findPendingGroupIds(userId, groupIds);

        // 7. DTO로 변환하면서 대기중 여부(isPending) 세팅 후 반환
        return studyGroups.map(group ->
                StudyGroupListResponseDto.of(group, pendingGroupIds.contains(group.getId()))
        );
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