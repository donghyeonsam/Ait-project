package com.aitserver.resume.dto;

import com.aitserver.resume.dto.ResumeCareerRequest;
import com.aitserver.resume.dto.ResumeProjectRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ResumeUpdateRequest(

        @NotNull
        List<@Valid ResumeTrainingRequest> trainings,

        @NotNull
        List<@Valid ResumeProjectRequest> projects,

        @NotNull
        List<@Valid ResumeCareerRequest> careers
) {
}