package com.aitserver.resume.dto;

import com.aitserver.resume.entity.ResumeCareer;

import java.time.LocalDate;

public record ResumeCareerResponse(
        Long careerId,
        LocalDate startDate,
        LocalDate endDate,
        String companyName,
        String role,
        String description
) {

    public static ResumeCareerResponse from(ResumeCareer career) {
        return new ResumeCareerResponse(
                career.getId(),
                career.getStartDate(),
                career.getEndDate(),
                career.getCompanyName(),
                career.getRole(),
                career.getDescription()
        );
    }
}