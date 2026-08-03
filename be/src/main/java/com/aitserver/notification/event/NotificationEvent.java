package com.aitserver.notification.event;

import com.aitserver.notification.entity.NotificationType;

public record NotificationEvent(
        Long receiverId,
        NotificationType type,
        Long targetId,
        String content
) {
}