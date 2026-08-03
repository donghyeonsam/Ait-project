package com.aitserver.user.entity;

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

    @Column(nullable = false, unique = true, length = 20)
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

    public void updateMyPage(
            String name,
            String nickname,
            String firstJobInterest,
            String secondJobInterest
    ) {
        this.name = name;
        this.nickname = nickname;
        this.firstJobInterest = firstJobInterest;
        this.secondJobInterest = secondJobInterest;
    }

    public void updateProfileImage(String profileImage) {
        this.profileImage = profileImage;
    }

    // 비밀번호 변경
    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    // 회원탈퇴
    public void withdraw() {
        this.deletedAt = LocalDateTime.now();
    }

    // 이메일, 닉네임 deleted붙이기
    public void anonymizeForWithdrawal() {
        String deletedEmail =
                "deleted_" + this.id + "_" + this.email;

        // email 컬럼 최대 길이 255자 방어
        if (deletedEmail.length() > 255) {
            deletedEmail = deletedEmail.substring(0, 255);
        }

        this.email = deletedEmail;

        // nickname 컬럼이 최대 20자이므로 기존 닉네임은 붙이지 않음
        this.nickname = "deleted_" + this.id;
    }
}