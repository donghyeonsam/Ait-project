package com.aitserver.coverletter.analysis.dto;

import com.aitserver.coverletter.entity.CoverLetter;
import com.aitserver.coverletter.entity.CoverLetterContent;

import java.util.Comparator;
import java.util.List;

public record CoverLetterAnalysisSource(
        String title,
        String companyName,
        String role,
        List<ContentSource> contents
) {

    public static CoverLetterAnalysisSource from(
            CoverLetter coverLetter
    ) {
        List<ContentSource> contents =
                coverLetter.getContents().stream()
                        .sorted(
                                Comparator.comparing(
                                        CoverLetterContent::getContentOrder
                                )
                        )
                        .map(ContentSource::from)
                        .toList();

        return new CoverLetterAnalysisSource(
                coverLetter.getTitle(),
                coverLetter.getCompanyName(),
                coverLetter.getRole(),
                contents
        );
    }

    public record ContentSource(
            Integer contentOrder,
            String question,
            String answer
    ) {

        public static ContentSource from(
                CoverLetterContent content
        ) {
            return new ContentSource(
                    content.getContentOrder(),
                    content.getQuestion(),
                    content.getAnswer()
            );
        }
    }
}