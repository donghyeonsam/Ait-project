package com.aitserver.studyGroupRoom.entity;


import com.aitserver.auth.entity.User;
import com.aitserver.studyGroupRoom.domain.StudyGroupMemberRole;
import com.aitserver.studyGroupRoom.domain.StudyGroupMemberStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(
        name = "study_group_members",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_study_group_members_group_user",
                        columnNames = {
                                "group_id",
                                "user_id"
                        }
                )
        },
        indexes = {
                @Index(
                        name = "idx_study_group_members_group_status",
                        columnList = "group_id, status"
                ),
                @Index(
                        name = "idx_study_group_members_user_id",
                        columnList = "user_id"
                )
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLDelete(sql = "UPDATE study_group_members SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?") // 본인 코드: Soft Delete 유지
@SQLRestriction("deleted_at IS NULL")
public class StudyGroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "group_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_study_group_members_group"
            )
    )
    private StudyGroup studyGroup;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "user_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_study_group_members_user"
            )
    )
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "role",
            nullable = false,
            length = 20
    )
    private StudyGroupMemberRole role;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "status",
            nullable = false,
            length = 20
    )
    private StudyGroupMemberStatus status;

    @Column(length = 300, nullable = false)
    private String message;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "left_at")
    private LocalDateTime leftAt;

    @CreationTimestamp
    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    public StudyGroupMember(StudyGroup studyGroup, User user, StudyGroupMemberRole role, StudyGroupMemberStatus status, String message) {
        this.studyGroup = studyGroup;
        this.user = user;
        this.role = role;
        this.status = status;
        this.message = message;

        // 생성 시점에 ACTIVE 상태라면 가입일 즉시 기록
        if (status == StudyGroupMemberStatus.ACTIVE) {
            this.joinedAt = LocalDateTime.now();
        }
    }

    public static StudyGroupMember createOwner(StudyGroup studyGroup, User owner) {
        return StudyGroupMember.builder()
                .studyGroup(studyGroup)
                .user(owner)
                .role(StudyGroupMemberRole.OWNER)
                .status(StudyGroupMemberStatus.ACTIVE) // 방장은 바로 ACTIVE
                .message("스터디장")
                .build();
    }

    public static StudyGroupMember createMember(StudyGroup studyGroup, User user, String message) {
        return StudyGroupMember.builder()
                .studyGroup(studyGroup)
                .user(user)
                .role(StudyGroupMemberRole.MEMBER)
                .status(StudyGroupMemberStatus.PENDING)
                .message(message)
                .build();
    }

    /**
     * 가입 승인 처리
     * 상태를 approved로 변경하고 가입 시간을 현재 시간으로 세팅합니다.
     */
    public void approve() {
        this.status = StudyGroupMemberStatus.ACTIVE;
        this.joinedAt = LocalDateTime.now();
    }

    public void leave() {
        this.status = StudyGroupMemberStatus.LEFT;
        this.leftAt = LocalDateTime.now();
        this.deletedAt = LocalDateTime.now();
    }

    public void kick() {
        if (this.role == StudyGroupMemberRole.OWNER) {
            throw new IllegalStateException(
                    "그룹장은 강퇴할 수 없습니다."
            );
        }

        this.status = StudyGroupMemberStatus.KICKED;
        this.leftAt = LocalDateTime.now();
    }

    public void rejoin() {
        if (this.status == StudyGroupMemberStatus.KICKED) {
            throw new IllegalStateException(
                    "강퇴된 사용자는 다시 가입할 수 없습니다."
            );
        }

        this.status = StudyGroupMemberStatus.PENDING;
        this.leftAt = null;
    }

    public boolean isActive() {
        return this.status == StudyGroupMemberStatus.ACTIVE
                && this.deletedAt == null;
    }

    public boolean isOwner() {
        return this.role == StudyGroupMemberRole.OWNER;
    }
}