package com.aitserver.user.scheduler;


import com.aitserver.user.repository.UserPurgeRepository;
import com.aitserver.user.service.UserPurgeWorker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class UserPurgeScheduler {

    private static final ZoneId ZONE_ID =
            ZoneId.of("Asia/Seoul");

    // 30일
    private static final int RETENTION_DAYS = 30;
    private static final int BATCH_SIZE = 100;

    private final UserPurgeRepository userPurgeRepository;
    private final UserPurgeWorker userPurgeWorker;

    @Scheduled(
            cron = "0 0 3 * * *",
            zone = "Asia/Seoul"
    )
    public void purgeExpiredUsers() {
        // 현재 시간
        LocalDateTime startedAt = LocalDateTime.now(ZONE_ID);

        // RETENTION_DAYS만큼 뒤로 돌린 시간
        LocalDateTime cutoff = startedAt.minusDays(RETENTION_DAYS);

        long lastId = 0L;
        int successCount = 0;   // 성공한 횟수
        int skippedCount = 0;   // 스킵한 횟수 -> 타 작업에서 접근중 or 복구
        int failedCount = 0;    // 실패한 횟수

        log.info("회원 영구 삭제 스케줄러 시작. cutoff={}", cutoff);

        while (true) {
            // 삭제 대상 batchsize 만큼 불러옴
            List<Long> userIds = userPurgeRepository.findExpiredUserIds(cutoff, lastId, BATCH_SIZE);

            if (userIds.isEmpty()) {
                break;
            }

            for (Long userId : userIds) {
                lastId = userId;

                try {
                    // 삭제 worker수행
                    boolean deleted = userPurgeWorker.purgeUser(userId, cutoff);

                    if (deleted) {
                        successCount++;
                    } else {
                        skippedCount++;
                    }

                } catch (Exception exception) {
                    // 삭제 실패시
                    failedCount++;

                    log.error("회원 영구 삭제 실패. userId={}", userId, exception);
                }
            }

            // 더 없으면
            if (userIds.size() < BATCH_SIZE) {
                break;
            }
        }

        log.info(
                """
                회원 영구 삭제 스케줄러 종료.
                cutoff={},
                successCount={},
                skippedCount={},
                failedCount={}
                """,
                cutoff,
                successCount,
                skippedCount,
                failedCount
        );
    }
}