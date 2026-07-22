package com.aitserver.resume.dto;

import com.aitserver.resume.entity.ResumeTraining;

import java.time.LocalDate;

public record ResumeTrainingResponse(
        Long trainingId,
        LocalDate startDate,
        LocalDate endDate,
        String organization,
        String course,
        String description
) {

    public static ResumeTrainingResponse from(ResumeTraining training) {
        return new ResumeTrainingResponse(
                training.getId(),
                training.getStartDate(),
                training.getEndDate(),
                training.getOrganization(),
                training.getCourse(),
                training.getDescription()
        );
    }
}