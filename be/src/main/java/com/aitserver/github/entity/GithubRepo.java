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
@Table(name = "github_repos")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GithubRepo {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "github_app_id", nullable = false)
    private GithubApp githubApp;

    @Column(nullable = false)
    private Long repoId;

    @Column(nullable = false, length = 50)
    private String repoName;

    @Column(nullable = false, length = 50)
    private String repoNickname;

    @Column(columnDefinition = "TEXT")
    private String analysisContent;

    @Column(nullable = false)
    private Boolean isPrivate = false;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Builder
    public GithubRepo(GithubApp githubApp, Long repoId, String repoName, String repoNickname, String analysisContent, Boolean isPrivate) {
        this.githubApp = githubApp;
        this.repoId = repoId;
        this.repoName = repoName;
        this.repoNickname = repoNickname;
        this.analysisContent = analysisContent;
        // null 값이 들어올 경우 기본값 false 유지
        this.isPrivate = isPrivate != null ? isPrivate : false;
    }
}