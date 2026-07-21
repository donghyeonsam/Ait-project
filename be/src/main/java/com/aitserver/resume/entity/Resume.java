package com.aitserver.resume.entity;


import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Getter
@Table(name = "resumes")
public class Resume {




    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;
    //    @ManyToOne(fetch = FetchType.LAZY)
    //    @JoinColumn(name = "user_id", nullable = false)
    //    private User user;

    @Column(name = "analysis_content", columnDefinition = "TEXT")
    private String analysisContent;


    @OneToMany(
            mappedBy = "resume",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private final List<ResumeTraining> trainings = new ArrayList<>();

    @OneToMany(
            mappedBy = "resume",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private final List<ResumeCareer> careers = new ArrayList<>();

    @OneToMany(
            mappedBy = "resume",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private final List<ResumeProject> projects = new ArrayList<>();

    @CreationTimestamp // INSERT 시 자동으로 현재 시간 설정 (DEFAULT CURRENT_TIMESTAMP 대응)
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp // UPDATE 시 자동으로 현재 시간 갱신 (ON UPDATE CURRENT_TIMESTAMP 대응)
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;



    public Resume(Long userId) {
        this.userId = userId;
    }

    public void updateAnalysisContent(String analysisContent) {
        this.analysisContent = analysisContent;
    }



}
