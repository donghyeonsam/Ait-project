package com.aitserver.resume.entity;


import com.aitserver.user.entity.User;
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


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

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

    // 교체
    public void addTraining(ResumeTraining training) {
        trainings.add(training);
        training.setResume(this);
    }

    public void addProject(ResumeProject project) {
        projects.add(project);
        project.setResume(this);
    }

    public void addCareer(ResumeCareer career) {
        careers.add(career);
        career.setResume(this);
    }

    // 해당 내용 삭제
    public void clearResumeDetails() {
        trainings.clear();
        projects.clear();
        careers.clear();
    }


    // 이력서 요약 추가
    public void updateAnalysisContent(
            String analysisContent
    ) {
        this.analysisContent = analysisContent;
    }

    // 수정시에 기존 내용 지우기
    public void clearAnalysisContent() {
        this.analysisContent = null;
    }

    public Resume(User user) {
        this.user = user;
    }

}
