package com.aitserver.resume.analysis.dto;

import com.aitserver.resume.entity.Resume;
import com.aitserver.resume.entity.ResumeCareer;
import com.aitserver.resume.entity.ResumeProject;
import com.aitserver.resume.entity.ResumeTraining;

import java.time.LocalDate;
import java.util.List;

public record ResumeAnalysisSource(
        List<TrainingSource> trainings,
        List<ProjectSource> projects,
        List<CareerSource> careers
) {

    public static ResumeAnalysisSource from(Resume resume) {
        List<TrainingSource> trainings =
                resume.getTrainings().stream()
                        .map(TrainingSource::from)
                        .toList();

        List<ProjectSource> projects =
                resume.getProjects().stream()
                        .map(ProjectSource::from)
                        .toList();

        List<CareerSource> careers =
                resume.getCareers().stream()
                        .map(CareerSource::from)
                        .toList();

        return new ResumeAnalysisSource(
                trainings,
                projects,
                careers
        );
    }

    public record TrainingSource(
            LocalDate startDate,
            LocalDate endDate,
            String organization,
            String course,
            String description
    ) {
        public static TrainingSource from(
                ResumeTraining training
        ) {
            return new TrainingSource(
                    training.getStartDate(),
                    training.getEndDate(),
                    training.getOrganization(),
                    training.getCourse(),
                    training.getDescription()
            );
        }
    }

    public record ProjectSource(
            String projectName,
            String techStacks,
            String role,
            String description
    ) {
        public static ProjectSource from(
                ResumeProject project
        ) {
            return new ProjectSource(
                    project.getProjectName(),
                    project.getTechStacks(),
                    project.getRole(),
                    project.getDescription()
            );
        }
    }

    public record CareerSource(
            LocalDate startDate,
            LocalDate endDate,
            String companyName,
            String role,
            String description
    ) {
        public static CareerSource from(
                ResumeCareer career
        ) {
            return new CareerSource(
                    career.getStartDate(),
                    career.getEndDate(),
                    career.getCompanyName(),
                    career.getRole(),
                    career.getDescription()
            );
        }
    }
}