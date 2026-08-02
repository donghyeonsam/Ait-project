package com.aitserver.notification.dto;

import com.aitserver.notification.entity.Notification;
import com.aitserver.notification.entity.NotificationType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class NotificationResponse {
    private Long id;
    private NotificationType type;
    private Long targetId;
    private String content;
    private boolean isChecked; // 읽음 여부
    private LocalDateTime createdAt; // 발생 시간

    // 엔티티를 DTO로 변환하는 정적 팩토리 메서드
    public static NotificationResponse from(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .targetId(notification.getTargetId())
                .content(notification.getContent())
                .isChecked(notification.getIsChecked())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}