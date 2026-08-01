package com.aitserver.auth.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 소셜 가입 및 연동 사용자 정보 (social_users).
 * users 1 : N social_users — 한 유저가 여러 provider를 연동할 수 있다.
 *
 * (provider, provider_id)로 소셜 계정을 식별한다.
 *  - provider    : "GOOGLE", "GITHUB" 등 (OAuthProvider.name())
 *  - provider_id : provider 내부 고유 ID (구글 sub, 깃허브 id 등)
 */
@Entity
@Table(
        name = "social_users",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_social_users_provider_provider_id",
                columnNames = {"provider", "provider_id"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SocialUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK: social_users.user_id → users.id (Resume(user)와 동일한 연관관계 스타일)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(name = "provider_id", nullable = false, length = 255)
    private String providerId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public SocialUser(User user, String provider, String providerId) {
        this.user = user;
        this.provider = provider;
        this.providerId = providerId;
    }
}