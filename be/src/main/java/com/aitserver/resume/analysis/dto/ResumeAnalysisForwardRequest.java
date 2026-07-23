package com.aitserver.resume.analysis.dto;

public record ResumeAnalysisForwardRequest(
        Long userId,
        Long resumeId,
        String analysisContent
) {
}