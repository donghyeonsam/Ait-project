package com.aitserver.github.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "github_apps")
@Getter
// JPA 스펙상 기본 생성자가 필요하지만, 외부에서 빈 객체 생성을 막기 위해 PROTECTED로 설정합니다.
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GithubApp {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String installationId;

    @Column(nullable = false, length = 30)
    private String githubUsername;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Builder
    public GithubApp(Long userId, String installationId, String githubUsername) {
        this.userId = userId;
        this.installationId = installationId;
        this.githubUsername = githubUsername;
    }
}