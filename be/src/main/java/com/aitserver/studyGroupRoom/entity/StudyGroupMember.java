package com.aitserver.studyGroupRoom.entity;


import com.aitserver.auth.entity.User;
import com.aitserver.studyGroupRoom.domain.StudyGroupMemberRole;
import com.aitserver.studyGroupRoom.domain.StudyGroupMemberStatus;
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

    @Column(
            name = "joined_at",
            nullable = false
    )
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

    @UpdateTimestamp
    @Column(
            name = "updated_at",
            nullable = false
    )
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    private StudyGroupMember(
            StudyGroup studyGroup,
            User user,
            StudyGroupMemberRole role
    ) {
        this.studyGroup = studyGroup;
        this.user = user;
        this.role = role;
        this.status = StudyGroupMemberStatus.ACTIVE;
        this.joinedAt = LocalDateTime.now();
    }

    public static StudyGroupMember createOwner(
            StudyGroup studyGroup,
            User owner
    ) {
        return new StudyGroupMember(
                studyGroup,
                owner,
                StudyGroupMemberRole.OWNER
        );
    }

    public static StudyGroupMember createMember(
            StudyGroup studyGroup,
            User user
    ) {
        return new StudyGroupMember(
                studyGroup,
                user,
                StudyGroupMemberRole.MEMBER
        );
    }

    public void leave() {
        if (this.role == StudyGroupMemberRole.OWNER) {
            throw new IllegalStateException(
                    "그룹장은 바로 탈퇴할 수 없습니다."
            );
        }

        this.status = StudyGroupMemberStatus.LEFT;
        this.leftAt = LocalDateTime.now();
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

        this.status = StudyGroupMemberStatus.ACTIVE;
        this.leftAt = null;

        if (this.joinedAt == null) {
            this.joinedAt = LocalDateTime.now();
        }
    }

    public boolean isActive() {
        return this.status == StudyGroupMemberStatus.ACTIVE
                && this.deletedAt == null;
    }

    public boolean isOwner() {
        return this.role == StudyGroupMemberRole.OWNER;
    }
}