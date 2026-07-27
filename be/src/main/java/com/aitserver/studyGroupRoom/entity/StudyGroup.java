
package com.aitserver.studyGroupRoom.entity;

import com.aitserver.auth.entity.User;
import com.aitserver.studyGroupRoom.domain.StudyGroupStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(
        name = "study_groups",
        indexes = {
                @Index(
                        name = "idx_study_groups_owner_id",
                        columnList = "owner_id"
                ),
                @Index(
                        name = "idx_study_groups_status_deleted_at",
                        columnList = "status, deleted_at"
                )
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyGroup {

    public static final int MAX_CAPACITY = 8;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "owner_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_study_groups_owner"
            )
    )
    private User owner;

    @Column(
            name = "title",
            nullable = false,
            length = 50
    )
    private String title;

    @Lob
    @Column(
            name = "description",
            nullable = false
    )
    private String description;

    @Column(
            name = "capacity",
            nullable = false
    )
    private Integer capacity;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "status",
            nullable = false,
            length = 20
    )
    private StudyGroupStatus status;

    @CreationTimestamp
    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(
            name = "updated_at",
            nullable = false
    )
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    private StudyGroup(
            User owner,
            String title,
            String description,
            Integer capacity
    ) {
        validateCapacity(capacity);

        this.owner = owner;
        this.title = title;
        this.description = description;
        this.capacity = capacity;
        this.status = StudyGroupStatus.RECRUITING;
    }

    public static StudyGroup create(
            User owner,
            String title,
            String description,
            Integer capacity
    ) {
        return new StudyGroup(
                owner,
                title,
                description,
                capacity
        );
    }

    public boolean isOwner(Long userId) {
        return this.owner.getId().equals(userId);
    }

    public boolean isClosed() {
        return this.status == StudyGroupStatus.CLOSED;
    }

    public boolean isDeleted() {
        return this.deletedAt != null;
    }

    public void activate() {
        if (isDeleted()) {
            throw new IllegalStateException(
                    "삭제된 스터디 그룹입니다."
            );
        }

        this.status = StudyGroupStatus.ACTIVE;
    }

    public void close() {
        this.status = StudyGroupStatus.CLOSED;
    }

    public void delete() {
        this.deletedAt = LocalDateTime.now();
        this.status = StudyGroupStatus.CLOSED;
    }

    private static void validateCapacity(
            Integer capacity
    ) {
        if (capacity == null
                || capacity < 1
                || capacity > MAX_CAPACITY) {
            throw new IllegalArgumentException(
                    "스터디 그룹 정원은 1명 이상 8명 이하여야 합니다."
            );
        }
    }
}