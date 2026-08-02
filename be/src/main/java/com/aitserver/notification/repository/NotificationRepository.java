package com.aitserver.notification.repository;

import com.aitserver.notification.entity.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // 유저 알림 조회
    Slice<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    // 2. 전체 읽음 처리 (Bulk Update - 안 읽은 것만 읽음 처리)
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Notification n SET n.isChecked = true WHERE n.user.id = :userId AND n.isChecked = false AND n.deletedAt IS NULL")
    void markAllAsReadByUserId(@Param("userId") Long userId);

    // 3. 전체 삭제 처리 (Bulk Soft Delete - 삭제 안 된 것만 삭제 처리)
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Notification n SET n.deletedAt = :now WHERE n.user.id = :userId AND n.deletedAt IS NULL")
    void softDeleteAllByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}