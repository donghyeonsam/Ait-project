package com.aitserver.auth.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA 규약상 기본 생성자 필수 (안전하게 PROTECTED)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // AUTO_INCREMENT 매핑
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false, length = 20)
    private String name;

    @Column(nullable = false, length = 20)
    private String nickname;

    @Column(nullable = false, length = 20)
    private String role = "USER"; // 기본값 지정 ('USER')

    @Column(name = "first_job_interest", length = 30)
    private String firstJobInterest;

    @Column(name = "second_job_interest", length = 30)
    private String secondJobInterest;

    @Column(name = "profile_image", length = 255)
    private String profileImage;

    @CreationTimestamp // INSERT 시 자동으로 현재 시간 설정 (DEFAULT CURRENT_TIMESTAMP 대응)
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp // UPDATE 시 자동으로 현재 시간 갱신 (ON UPDATE CURRENT_TIMESTAMP 대응)
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // --- 생성자 (Builder 패턴 제공) ---
    @Builder
    public User(String email, String password, String name, String nickname, String role,
                String firstJobInterest, String secondJobInterest, String profileImage) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.nickname = nickname;
        this.role = (role != null) ? role : "USER";
        this.firstJobInterest = firstJobInterest;
        this.secondJobInterest = secondJobInterest;
        this.profileImage = profileImage;
    }

    public void withdraw() {
        if (this.deletedAt != null) {
            return;
        }

        String anonymizationKey = UUID.randomUUID().toString();
        this.email =
                "withdrawn-" + this.id + "-" + anonymizationKey
                        + "@deleted.local";
        this.password = "{withdrawn}" + anonymizationKey;
        this.name = "탈퇴회원";
        this.nickname =
                ("wd-" + anonymizationKey.replace("-", ""))
                        .substring(0, 20);
        this.role = "WITHDRAWN";
        this.firstJobInterest = null;
        this.secondJobInterest = null;
        this.profileImage = null;
        this.deletedAt = LocalDateTime.now();
    }
}
