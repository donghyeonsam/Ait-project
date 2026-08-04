package com.aitserver.dashboard.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class MyStudyCalendarResponse {


    private Long calendarId;

    private Long groupId;

    private String groupTitle;

    private String content;

    private LocalDateTime startTime;
}
