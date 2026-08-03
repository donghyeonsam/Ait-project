package com.aitserver.notification.controller;

import com.aitserver.global.response.ApiResponse;
import com.aitserver.notification.dto.NotificationResponse;
import com.aitserver.notification.entity.Notification;
import com.aitserver.notification.entity.NotificationType;
import com.aitserver.notification.event.NotificationEvent;
import com.aitserver.notification.service.NotificationService;
import com.aitserver.notification.service.NotificationSseService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationSseService sseService;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 1. 모든 알림 목록 조회 (읽은 알림 포함, 최신순)
     * [GET] /api/notifications
     */
    @GetMapping
    public ResponseEntity<ApiResponse<NotificationResponse.ScrollResponse>>getNotifications(
            @AuthenticationPrincipal Long userId,
            @PageableDefault(size = 5) Pageable pageable,
            HttpServletRequest request) {

        NotificationResponse.ScrollResponse response = notificationService.getNotifications(userId, pageable);

        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "알림 목록 조회 성공", response, request));
    }

    /**
     * 2. 단일 알림 읽음 처리
     * [PATCH] /api/notifications/{notificationId}/read
     */
    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<ApiResponse<Void>> readNotification(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        notificationService.readNotification(notificationId, userId);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "알림을 읽음 처리했습니다.", request));
    }

    /**
     * 3. 모든 알림 전체 읽음 처리
     * [PATCH] /api/notifications/read-all
     */
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> readAllNotifications(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        notificationService.readAllNotifications(userId);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "모든 알림을 읽음 처리했습니다.",request));
    }

    /**
     * 4. 단일 알림 삭제 (Soft Delete)
     * [DELETE] /api/notifications/{notificationId}
     */
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        notificationService.deleteNotification(notificationId, userId);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "알림이 삭제되었습니다.",request));
    }

    /**
     * 5. 모든 알림 전체 삭제 (Bulk Soft Delete)
     * [DELETE] /api/notifications
     */
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteAllNotifications(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        notificationService.deleteAllNotifications(userId);
        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "모든 알림이 삭제되었습니다.",request));
    }

    @GetMapping(value = "/stream", produces = "text/event-stream")
    public ResponseEntity<SseEmitter> subscribe(@AuthenticationPrincipal Long userId) {
        // ApiResponse 같은 커스텀 래퍼를 쓰지 않고 순수 SseEmitter를 반환해야 합니다!
        return ResponseEntity.ok(sseService.subscribe(userId));
    }

    @GetMapping("/test-send")
    @Transactional
    public ResponseEntity<String> testSendSse(
            @RequestParam Long receiverId) { // 토큰 없이 강제로 받을 사람 ID를 입력받음

        // 2. 가짜 이벤트 강제 발행
        eventPublisher.publishEvent(new NotificationEvent(
                receiverId,
                NotificationType.COMMENT, // 테스트용 타입
                999L,                     // 테스트용 타겟 ID
                "프론트엔드 없이 Postman으로 쏘는 실시간 알림 테스트입니다!"
        ));

        return ResponseEntity.ok("테스트 알림 이벤트 발행 완료! (수신자 ID: " + receiverId + ")");
    }
}
