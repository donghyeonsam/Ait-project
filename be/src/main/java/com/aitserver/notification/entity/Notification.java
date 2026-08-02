package com.aitserver.notification.entity;

import com.aitserver.auth.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted_at IS NULL")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "is_checked", nullable = false)
    private Boolean isChecked;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    public Notification(User user, NotificationType type, Long targetId, String content) {
        this.user = user;
        this.type = type;
        this.targetId = targetId;
        this.content = content;
        this.isChecked = false;
    }

    // 알림 읽음 처리 메서드
    public void read() {
        this.isChecked = true;
    }

    // 알림 삭제
    public void delete() {
        this.deletedAt = LocalDateTime.now();
    }
}
