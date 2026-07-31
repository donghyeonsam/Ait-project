package com.aitserver.aiInterview.responseDto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ReportListResponse {

    private Long aiInterviewId;

    private String interviewType;

    private String difficulty;

    private String aiAttitudeStyle;

    private String status;

    private double score;

    private LocalDateTime createdAt;
    private LocalDateTime endedAt;
}
