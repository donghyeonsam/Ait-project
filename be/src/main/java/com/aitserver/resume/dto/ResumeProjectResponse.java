package com.aitserver.resume.dto;

import com.aitserver.resume.entity.ResumeProject;

public record ResumeProjectResponse(
        Long projectId,
        String projectName,
        String techStacks,
        String role,
        String description
) {

    public static ResumeProjectResponse from(ResumeProject project) {
        return new ResumeProjectResponse(
                project.getId(),
                project.getProjectName(),
                project.getTechStacks(),
                project.getRole(),
                project.getDescription()
        );
    }
}