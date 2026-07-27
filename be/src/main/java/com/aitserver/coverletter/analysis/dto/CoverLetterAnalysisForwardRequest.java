package com.aitserver.coverletter.analysis.dto;

public record CoverLetterAnalysisForwardRequest(
        Long userId,
        Long coverLetterId,
        String analysisContent
) {
}