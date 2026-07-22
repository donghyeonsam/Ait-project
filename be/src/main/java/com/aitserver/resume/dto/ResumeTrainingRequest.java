package com.aitserver.resume.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ResumeTrainingRequest(

        @NotNull
        LocalDate startDate,

        @NotNull
        LocalDate endDate,

        @NotBlank
        @Size(max = 50)
        String organization,

        @NotBlank
        @Size(max = 50)
        String course,

        @NotBlank
        String description
) {
}