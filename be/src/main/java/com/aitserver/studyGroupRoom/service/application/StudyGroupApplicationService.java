package com.aitserver.studyGroupRoom.service.application;

import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.notification.entity.NotificationType;
import com.aitserver.notification.event.NotificationEvent;
import com.aitserver.studyGroupRoom.domain.StudyGroupMemberStatus;
import com.aitserver.studyGroupRoom.dto.application.ApplicationCreateRequest;
import com.aitserver.studyGroupRoom.dto.application.ApplicationProcessRequest;
import com.aitserver.studyGroupRoom.dto.application.ApplicationResponse;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.entity.StudyGroupMember;
import com.aitserver.studyGroupRoom.repository.StudyGroupMemberRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StudyGroupApplicationService {
    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;
    private final UserRepository userRepository; // User 엔티티 조회를 위해 필요
    private final ApplicationEventPublisher eventPublisher;

    // 1. 가입 신청하기 (POST)
    @Transactional
    public void applyToGroup(Long groupId, Long currentUserId, ApplicationCreateRequest request) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        Optional<StudyGroupMember> existingMember =
                studyGroupMemberRepository.findByGroupAndUserIncludeDeleted(groupId, currentUserId);

        if (existingMember.isPresent()) {
            StudyGroupMember member = existingMember.get();

            // 2. 과거 상태에 따른 분기 처리
            switch (member.getStatus()) {
                case ACTIVE:
                case PENDING:
                    // 이미 활동 중이거나 신청 대기 중인 경우
                    throw new BusinessException(ErrorCode.ALREADY_MEMBER_OR_APPLIED);

                case KICKED:
                    // 강퇴당한 유저는 재가입 불가
                    throw new BusinessException(ErrorCode.KICKED_USER_CANNOT_REJOIN);

                case LEFT:
                case REJECTED:
                    // 스스로 나갔거나 거절당했던 유저 -> 상태를 대기(PENDING)로 돌리고 부활
                    member.rejoin();
                    member.updateMessage(request.getMessage()); // 새로운 가입 메시지로 갱신
                    break;
            }
        } else {
            // 3. 완전 최초 가입인 경우 (기존 로직 동일)
            StudyGroupMember application = StudyGroupMember.createMember(group, user, request.getMessage());
            studyGroupMemberRepository.save(application);
        }

        eventPublisher.publishEvent(new NotificationEvent(
                group.getOwner().getId(),
                NotificationType.GROUP_APPLY,
                group.getId(),
                "[" + group.getTitle() + "] 그룹에 새로운 가입 신청이 들어왔습니다."
        ));
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
            application.approve();

            eventPublisher.publishEvent(new NotificationEvent(
                    application.getUser().getId(),
                    NotificationType.GROUP_APPROVE,
                    group.getId(),
                    "[" + group.getTitle() + "] 그룹 가입이 승인되었습니다!"
            ));
        } else {
            application.reject();

            eventPublisher.publishEvent(new NotificationEvent(
                    application.getUser().getId(),
                    NotificationType.GROUP_REJECT,
                    group.getId(),
                    "[" + group.getTitle() + "] 그룹 가입이 거절되었습니다."
            ));
        }
    }
}
