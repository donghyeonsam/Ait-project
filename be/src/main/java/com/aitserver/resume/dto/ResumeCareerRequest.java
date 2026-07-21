package com.aitserver.resume.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ResumeCareerRequest(

        @NotNull
        LocalDate startDate,

        LocalDate endDate,

        @NotBlank
        @Size(max = 100)
        String companyName,

        @NotBlank
        @Size(max = 50)
        String role,

        @NotBlank
        String description
) {
}