package com.aitserver.resume.analysis.dto;

public record ResumeAnalysisContext(
        Long userId,
        ResumeAnalysisSource source
) {
}