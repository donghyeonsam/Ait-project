package com.aitserver.coverletter.dto;

import com.aitserver.coverletter.entity.CoverLetter;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CoverLetterListResult {
    private Long coverLetterId;
    private String title;
    private String companyName;
    private String role;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CoverLetterListResult from(CoverLetter coverLetter) {
        return CoverLetterListResult.builder()
                .coverLetterId(coverLetter.getId())
                .title(coverLetter.getTitle())
                .companyName(coverLetter.getCompanyName())
                .role(coverLetter.getRole())
                .createdAt(coverLetter.getCreatedAt())
                .updatedAt(coverLetter.getUpdatedAt())
                .build();
    }




}
