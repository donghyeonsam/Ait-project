package com.aitserver.studygroup.entity;

import com.aitserver.auth.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

@Entity
@Table(name = "study_group_members")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // 기본 생성자 접근 제어
@SQLDelete(sql = "UPDATE study_group_members SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
@SQLRestriction("deleted_at IS NULL") // 삭제된 데이터 자동 제외
public class StudyGroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private StudyGroup studyGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 가입 인사말: 방장은 가입 신청 행위가 없으므로 NULL 허용
    @Column(length = 300, nullable = false)
    private String message;

    // 멤버 상태: "pending"(대기), "approved"(승인) 등 문자열 관리
    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    public StudyGroupMember(StudyGroup studyGroup, User user, String message, String status, LocalDateTime joinedAt) {
        this.studyGroup = studyGroup;
        this.user = user;
        this.message = message;
        this.status = status != null ? status : "pending"; // 기본값은 대기 상태
        this.joinedAt = joinedAt;
    }

    /**
     * 가입 승인 처리
     * 상태를 approved로 변경하고 가입 시간을 현재 시간으로 세팅합니다.
     */
    public void approve() {
        this.status = "approved";
        this.joinedAt = LocalDateTime.now();
    }
}