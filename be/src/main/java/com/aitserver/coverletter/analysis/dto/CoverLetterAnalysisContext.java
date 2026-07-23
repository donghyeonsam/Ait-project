package com.aitserver.coverletter.analysis.dto;

public record CoverLetterAnalysisContext(
        Long userId,
        CoverLetterAnalysisSource source
) {
}