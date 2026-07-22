package com.aitserver.resume.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResumeProjectRequest(

        @NotBlank
        @Size(max = 50)
        String projectName,

        @NotBlank
        @Size(max = 255)
        String techStacks,

        @NotBlank
        @Size(max = 50)
        String role,

        @NotBlank
        String description
) {
}