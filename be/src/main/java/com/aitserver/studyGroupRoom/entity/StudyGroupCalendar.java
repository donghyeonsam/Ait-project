package com.aitserver.studyGroupRoom.entity;

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
@Table(name = "study_group_calendars")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLDelete(sql = "UPDATE study_group_calendars SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class StudyGroupCalendar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false, foreignKey = @ForeignKey(name = "fk_study_group_calendars_group"))
    private StudyGroup studyGroup;

    @Column(nullable = false)
    private String content;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    public StudyGroupCalendar(StudyGroup studyGroup, String content, LocalDateTime startTime) {
        this.studyGroup = studyGroup;
        this.content = content;
        this.startTime = startTime;
    }

    public void update(String content, LocalDateTime startTime) {
        this.content = content;
        this.startTime = startTime;
    }

    public void deleteCalendar() {
        this.deletedAt = LocalDateTime.now();
    }
}