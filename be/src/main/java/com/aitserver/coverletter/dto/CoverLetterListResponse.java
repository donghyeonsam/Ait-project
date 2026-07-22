package com.aitserver.coverletter.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class CoverLetterListResponse {

    private List<CoverLetterListResult> coverLetters;

    private int totalCount;

}
