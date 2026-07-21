package com.aitserver.resume.dto;

import com.aitserver.resume.entity.Resume;

import java.time.LocalDateTime;
import java.util.List;

public record ResumeResponse(
        Long resumeId,
        Long userId,
        String userName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<ResumeTrainingResponse> trainings,
        List<ResumeProjectResponse> projects,
        List<ResumeCareerResponse> careers
) {

    public static ResumeResponse from(Resume resume) {
        return new ResumeResponse(
                resume.getId(),
                resume.getUser().getId(),
                resume.getUser().getName(),
                resume.getCreatedAt(),
                resume.getUpdatedAt(),

                resume.getTrainings().stream()
                        .map(ResumeTrainingResponse::from)
                        .toList(),

                resume.getProjects().stream()
                        .map(ResumeProjectResponse::from)
                        .toList(),

                resume.getCareers().stream()
                        .map(ResumeCareerResponse::from)
                        .toList()
        );
    }
}