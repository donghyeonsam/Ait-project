package com.aitserver.resume.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "resume_projects")
public class ResumeProject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id", nullable = false)
    private Resume resume;

//    @ManyToOne(fetch = FetchType.LAZY)
//    @JoinColumn(name = "github_repo_id")
//    private GithubRepo githubRepo;
    @Column(name = "github_repo_id")
    private Long githubRepoId;

    @Column(name = "project_name", nullable = false, length = 50)
    private String projectName;

    @Column(name = "tech_stacks", nullable = false, length = 255)
    private String techStacks;

    @Column(nullable = false, length = 50)
    private String role;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    public void setResume(Resume resume) {
        this.resume = resume;
    }
}