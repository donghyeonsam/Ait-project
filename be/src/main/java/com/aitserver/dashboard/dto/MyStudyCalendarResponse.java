package com.aitserver.dashboard.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyStudyCalendarResponse {


    private Long calendarId;

    private Long groupId;

    private String groupTitle;

    private String content;

    private LocalDateTime startTime;
}
