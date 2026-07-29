package com.aitserver.studyGroupRoom.dto.calendar;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
public class CalendarRequest {
    private String content;
    private LocalDateTime startTime;
}