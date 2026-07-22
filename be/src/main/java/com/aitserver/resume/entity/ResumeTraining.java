package com.aitserver.resume.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "resume_trainings")
public class ResumeTraining {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id", nullable = false)
    private Resume resume;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(nullable = false, length = 50)
    private String organization;

    @Column(nullable = false, length = 50)
    private String course;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    public ResumeTraining(
            LocalDate startDate,
            LocalDate endDate,
            String organization,
            String course,
            String description
    ) {
        this.startDate = startDate;
        this.endDate = endDate;
        this.organization = organization;
        this.course = course;
        this.description = description;
    }

    public void setResume(Resume resume) {
        this.resume = resume;
    }
}
