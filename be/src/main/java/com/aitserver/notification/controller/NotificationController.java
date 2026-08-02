package com.aitserver.notification.controller;

import com.aitserver.global.response.ApiResponse;
import com.aitserver.notification.dto.NotificationResponse;
import com.aitserver.notification.entity.Notification;
import com.aitserver.notification.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * 1. 모든 알림 목록 조회 (읽은 알림 포함, 최신순)
     * [GET] /api/notifications
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse>>> getNotifications(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        List<NotificationResponse> responses = notificationService.getNotifications(userId)
                .stream()
                .map(NotificationResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.success(HttpStatus.OK, "알림 목록 조회 성공", responses, request));
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
}