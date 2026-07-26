package com.aitserver.studygroup.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "study_groups")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLDelete(sql = "UPDATE study_groups SET deleted_at = CURRENT_TIMESTAMP WHERE id = id")
@SQLRestriction("deleted_at IS NULL") // 삭제된 스터디 그룹은 자동 필터링
public class StudyGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(nullable = false, length = 50)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private int capacity;

    @Column(nullable = false, length = 20)
    private String status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    public StudyGroup(Long ownerId, String title, String description, int capacity) {
        this.ownerId = ownerId;
        this.title = title;
        this.description = description;
        this.capacity = capacity;
        this.status = "recruiting";
    }

    // 스터디 상태 변경
    public void changeStatus(String newStatus) {
        this.status = newStatus;
    }

    // 정보 수정
    public void updateInfo(String title, String description, int capacity) {
        this.title = title;
        this.description = description;
        this.capacity = capacity;
    }
}