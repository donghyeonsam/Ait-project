package com.aitserver.notification.event;

import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import com.aitserver.notification.entity.Notification;
import com.aitserver.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT) // 본 로직 커밋 성공 시에만 동작
    @Transactional(propagation = Propagation.REQUIRES_NEW) // 독립적인 트랜잭션 사용
    public void handleNotification(NotificationEvent event) {
        try {
            // 프록시 객체만 가져와서 DB 쿼리 최소화 (getReferenceById)
            User receiver = userRepository.getReferenceById(event.receiverId());

            Notification notification = Notification.builder()
                    .user(receiver)
                    .type(event.type())
                    .targetId(event.targetId())
                    .content(event.content())
                    .build();

            notificationRepository.save(notification);
        } catch (Exception e) {
            // 알림 저장에 실패하더라도 기존 비즈니스 로직에 영향을 주면 안 되므로 로깅만 처리
            log.error("알림 저장 실패: receiverId={}, message={}", event.receiverId(), e.getMessage());
        }
    }
}