package com.aitserver.studyGroupRoom.dto.calendar;

import com.aitserver.studyGroupRoom.entity.StudyGroupCalendar;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
@Getter
@Builder
public class CalendarResponse {
    private Long calendarId;
    private String content;
    private LocalDateTime startTime;

    public static CalendarResponse from(StudyGroupCalendar calendar) {
        return CalendarResponse.builder()
                .calendarId(calendar.getId())
                .content(calendar.getContent())
                .startTime(calendar.getStartTime())
                .build();
    }
}