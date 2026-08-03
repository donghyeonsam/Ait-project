package com.aitserver.user.service;



import com.aitserver.user.repository.UserPurgeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserPurgeWorker {

    private final UserPurgeRepository userPurgeRepository;


    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean purgeUser(
            Long userId,
            LocalDateTime cutoff
    ) {

        // 삭제 직전 해당 사용자의 상태를 확인하고 잠금 상태로 지정
        boolean expired = userPurgeRepository.lockExpiredUser(userId, cutoff);

        // 이미 다른 작업에서 삭제되었거나 복구가 되었을 경우
        if (!expired) {
            log.info("회원 영구 삭제 제외. userId={}", userId);
            return false;
        }

        // 상호 평가 삭제, evaluator, evaluatee 둘다
        int deletedPeerFeedbacks = userPurgeRepository.deletePeerFeedbacks(userId);

        // 상호 평가 ai 요약 삭제
        int deletedAiPeerSummaries = userPurgeRepository.deleteAiPeerSummaries(userId);

        // 그룹 채팅 내역 삭제
        int deletedStudyGroupChats = userPurgeRepository.deleteStudyGroupChats(userId);

        // 속해있는 그룹 데이터 삭제
        int deletedStudyGroupMembers = userPurgeRepository.deleteStudyGroupMembers(userId);


        // 사용자가 그룹장인 그룹 삭제, 하위 데이터는 ON DELETE CASCADE로 삭제됨
        int deletedStudyGroups = userPurgeRepository.deleteOwnedStudyGroups(userId);



        // 최종 users 물리 삭제, 하위 데이터들(userSkill, resumes, coverLetter, post, aiInterviews는 ON DELETE CASCADE로 삭제됨)
        int deletedUsers = userPurgeRepository.deleteUser(userId);

        if (deletedUsers != 1) {
            throw new IllegalStateException("회원 물리 삭제에 실패했습니다. userId=" + userId);
        }

        log.info(
                """
                회원 영구 삭제 완료.
                userId={},
                peerFeedbacks={},
                aiPeerSummaries={},
                studyGroupChats={},
                studyGroupMembers={},
                studyGroups={}
                """,
                userId,
                deletedPeerFeedbacks,
                deletedAiPeerSummaries,
                deletedStudyGroupChats,
                deletedStudyGroupMembers,
                deletedStudyGroups
        );

        return true;
    }
}
