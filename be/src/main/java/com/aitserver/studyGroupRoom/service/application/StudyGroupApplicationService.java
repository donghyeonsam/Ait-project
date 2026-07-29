package com.aitserver.studyGroupRoom.service.application;

import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.studyGroupRoom.domain.StudyGroupMemberStatus;
import com.aitserver.studyGroupRoom.dto.application.ApplicationCreateRequest;
import com.aitserver.studyGroupRoom.dto.application.ApplicationProcessRequest;
import com.aitserver.studyGroupRoom.dto.application.ApplicationResponse;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.entity.StudyGroupMember;
import com.aitserver.studyGroupRoom.repository.StudyGroupMemberRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudyGroupApplicationService {
    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final UserRepository userRepository; // User 엔티티 조회를 위해 필요

    // 1. 가입 신청하기 (POST)
    @Transactional
    public void applyToGroup(Long groupId, Long currentUserId, ApplicationCreateRequest request) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        // 이미 가입되어 있거나 신청(PENDING) 중인지 체크
        if (studyGroupMemberRepository.existsByStudyGroupIdAndUserId(groupId, currentUserId)) {
            throw new BusinessException(ErrorCode.ALREADY_MEMBER_OR_APPLIED); // 에러코드 추가 필요
        }

        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // PENDING 상태로 멤버 엔티티 생성
        StudyGroupMember application = StudyGroupMember.createMember(group, user, request.getMessage());
        studyGroupMemberRepository.save(application);
    }

    // 2. 신청 목록 조회 (GET - 방장만 가능)
    @Transactional(readOnly = true)
    public List<ApplicationResponse> getApplications(Long groupId, Long currentUserId) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        // 방장인지 권한 검증
        if (!group.isOwner(currentUserId)) {
            throw new BusinessException(ErrorCode.NOT_GROUP_OWNER); // 에러코드 추가 필요
        }

        // PENDING 상태인 멤버 목록만 조회
        return studyGroupMemberRepository.findByStudyGroupIdAndStatus(groupId, StudyGroupMemberStatus.PENDING)
                .stream()
                .map(ApplicationResponse::from)
                .toList();
    }

    // 3. 가입 승인/거절 (PATCH - 방장만 가능)
    @Transactional
    public void processApplication(Long groupId, Long applicationId, Long currentUserId, ApplicationProcessRequest request) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        // 방장인지 권한 검증
        if (!group.isOwner(currentUserId)) {
            throw new BusinessException(ErrorCode.NOT_GROUP_OWNER);
        }

        // applicationId로 신청 건 조회
        StudyGroupMember application = studyGroupMemberRepository.findById(applicationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.APPLICATION_NOT_FOUND));

        // 해당 신청건이 진짜 이 그룹의 것인지, 그리고 PENDING 상태가 맞는지 검증
        if (!application.getStudyGroup().getId().equals(groupId) || application.getStatus() != StudyGroupMemberStatus.PENDING) {
            throw new BusinessException(ErrorCode.INVALID_APPLICATION);
        }

        // 승인 or 거절 (더티 체킹으로 자동 UPDATE)
        if (request.isApprove()) {
            application.approve(); // 상태 ACTIVE로 변경, joinedAt 세팅
            // TODO: (선택) 여기서 group.addMemberCount() 처럼 현재 멤버 수를 +1 해주는 로직이 필요할 수 있습니다.
        } else {
            application.reject(); // 상태 REJECTED로 변경, deletedAt 세팅
        }
    }
}
