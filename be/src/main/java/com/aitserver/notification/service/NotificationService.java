package com.aitserver.notification.service;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.notification.dto.NotificationResponse;
import com.aitserver.notification.entity.Notification;
import com.aitserver.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;

    // 1. 모든 알림 목록 조회
    public NotificationResponse.ScrollResponse getNotifications(Long userId, Pageable pageable) {

        Slice<Notification> notificationSlice = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, pageable);

        List<NotificationResponse> notificationList = notificationSlice.getContent().stream()
                .map(NotificationResponse::from)
                .toList();

        return new NotificationResponse.ScrollResponse(notificationList, notificationSlice.hasNext());
    }

    // 2. 단일 알림 읽음 처리
    @Transactional
    public void readNotification(Long notificationId, Long userId) {
        Notification notification = getNotificationWithAuthCheck(notificationId, userId);
        notification.read();
    }

    // 3. 모든 알림 읽음 처리
    @Transactional
    public void readAllNotifications(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    // 4. 단일 알림 삭제
    @Transactional
    public void deleteNotification(Long notificationId, Long userId) {
        Notification notification = getNotificationWithAuthCheck(notificationId, userId);
        notification.delete();
    }

    // 5. 모든 알림 삭제
    @Transactional
    public void deleteAllNotifications(Long userId) {
        notificationRepository.softDeleteAllByUserId(userId, LocalDateTime.now());
    }

    // --- 공통 검증 로직 ---
    private Notification getNotificationWithAuthCheck(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOTIFICATION_NOT_FOUND));

        if (!notification.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_NOTIFICATION_ACTION);
        }
        return notification;
    }
}