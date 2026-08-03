
package com.aitserver.studyGroupRoom.entity;

import com.aitserver.user.entity.User;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.studyGroupRoom.domain.StudyGroupStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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
@SQLDelete(sql = "UPDATE study_groups SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@SQLRestriction("deleted_at IS NULL") // 삭제된 스터디 그룹은 자동 필터링
public class StudyGroup {

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

    @Column(
            name = "description",
            nullable = false,
            columnDefinition = "TEXT"
    )
    private String description;

    public static final int MAX_CAPACITY = 8;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "status",
            nullable = false,
            length = 20
    )
    private StudyGroupStatus status;

    @OneToMany(mappedBy = "studyGroup", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StudyGroupMember> members = new ArrayList<>();

    @Formula("(SELECT COUNT(*) FROM study_group_members m WHERE m.group_id = id AND m.status = 'ACTIVE' AND m.deleted_at IS NULL)")
    private int currentMemberCount;

    @Column(name = "chat_notice", length = 255)
    private String chatNotice;

    @CreationTimestamp
    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    public StudyGroup(User owner, String title, String description) {
        this.owner = owner;
        this.title = title;
        this.description = description;
        this.status = StudyGroupStatus.RECRUITING;
    }

    public void changeStatus(StudyGroupStatus newStatus) {
        this.status = newStatus;
    }

    public boolean isOwner(Long userId) {
        return this.owner.getId().equals(userId);
    }

    public boolean isClosed() {
        return this.status == StudyGroupStatus.CLOSED;
    }

    public void deleteGroup() {
        this.status = StudyGroupStatus.CLOSED;
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isFull() {
        return this.currentMemberCount >= MAX_CAPACITY;
    }

    public void validateCapacity() {
        if (isFull()) {
            throw new BusinessException(ErrorCode.STUDY_GROUP_FULL);
        }
    }

    public boolean isMember(Long userId) {
        return this.members.stream()
                .anyMatch(member -> member.getUser().getId().equals(userId)
                        && member.isActive()); // StudyGroupMember에 있는 isActive() 활용
    }

    public void validateMember(Long userId) {
        if (!isMember(userId)) {
            throw new BusinessException(ErrorCode.NOT_GROUP_MEMBER);
        }
    }

    public void updateChatNotice(String newNotice) {
        this.chatNotice = newNotice;
    }

    public void deleteChatNotice() {
        this.chatNotice = null;
    }

    public void changeOwner(User newOwner) {
        this.owner = newOwner;
    }
}
