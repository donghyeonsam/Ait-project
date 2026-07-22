package com.aitserver.coverletter.dto;

import com.aitserver.coverletter.entity.CoverLetter;
import com.aitserver.coverletter.entity.CoverLetterContent;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class CoverLetterContentResponse {

    private Long contentId;
    private Integer contentOrder;
    private String question;
    private String answer;

    public static CoverLetterContentResponse from(CoverLetterContent coverLetterContent) {
        return CoverLetterContentResponse.builder()
                .contentId(coverLetterContent.getId())
                .contentOrder(coverLetterContent.getContentOrder())
                .question(coverLetterContent.getQuestion())
                .answer(coverLetterContent.getAnswer())
                .build();
    }
}
