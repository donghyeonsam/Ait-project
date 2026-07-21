package com.aitserver.github.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "github_repos")
@Getter
@Setter
@NoArgsConstructor
public class GithubRepo {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 외래키 설정: github_app_id 컬럼이 GithubApp 테이블의 id를 참조함
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
    private String analysisContent; //비동기처리

    @Column(nullable = false)
    private Boolean isPrivate = false;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}