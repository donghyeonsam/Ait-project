package com.aitserver.coverletter.dto;


import com.aitserver.coverletter.entity.CoverLetter;
import com.aitserver.coverletter.entity.CoverLetterContent;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
public class CoverLetterDetailResponse {

    private Long coverLetterId;
    private String title;
    private String companyName;
    private String role;
    private String analysisContent;

    private List<CoverLetterContentResponse> coverLetterContents;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CoverLetterDetailResponse from(CoverLetter coverLetter) {

        List<CoverLetterContentResponse> contentResponses =
                new ArrayList<>();

        for (CoverLetterContent content : coverLetter.getContents()) {
            CoverLetterContentResponse contentResponse =
                    CoverLetterContentResponse.from(content);

            contentResponses.add(contentResponse);
        }

        return CoverLetterDetailResponse.builder()
                .coverLetterId(coverLetter.getId())
                .title(coverLetter.getTitle())
                .companyName(coverLetter.getCompanyName())
                .role(coverLetter.getRole())
                .analysisContent(coverLetter.getAnalysisContent())
                .coverLetterContents(contentResponses)
                .createdAt(coverLetter.getCreatedAt())
                .updatedAt(coverLetter.getUpdatedAt())
                .build();
    }


}
