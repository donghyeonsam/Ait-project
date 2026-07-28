package com.aitserver.studyGroupRoom.controller;

import com.aitserver.global.response.ApiResponse;
import com.aitserver.studyGroupRoom.dto.CalendarRequest;
import com.aitserver.studyGroupRoom.dto.CalendarResponse;
import com.aitserver.studyGroupRoom.service.StudyGroupCalendarCommandService;
import com.aitserver.studyGroupRoom.service.StudyGroupCalendarQueryService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/study-groups/{groupId}/calendars")
@RequiredArgsConstructor
public class StudyGroupCalendarController {

    private final StudyGroupCalendarQueryService calendarQueryService;
    private final StudyGroupCalendarCommandService calendarCommandService;

    // 1. 월별 일정 조회
    @GetMapping
    public ResponseEntity<ApiResponse<List<CalendarResponse>>> getMonthlyCalendars(
            @PathVariable Long groupId,
            @AuthenticationPrincipal Long currentuserId,
            @RequestParam int year,
            @RequestParam int month,
            HttpServletRequest request) {

        List<CalendarResponse> responses = calendarQueryService.getMonthlyCalendars(groupId, currentuserId, year, month);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                year + "년 " + month + "월 일정 조회 성공",
                responses,
                request
        ));
    }

    // 2. 특정 날짜 조회
    // 예: GET /api/v1/study-groups/1/calendars/daily?date=2026-07-28
    @GetMapping("/daily")
    public ResponseEntity<ApiResponse<List<CalendarResponse>>> getDailyCalendars(
            @PathVariable Long groupId,
            @AuthenticationPrincipal Long currentUserId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest request) {

        List<CalendarResponse> responses = calendarQueryService.getDailyCalendars(groupId, currentUserId, date);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "일별 일정 조회 성공",
                responses,
                request
        ));
    }

    // 3. 일정 등록
    @PostMapping
    public ResponseEntity<ApiResponse<Void>> createCalendar(
            @PathVariable Long groupId,
            @AuthenticationPrincipal Long currentUserId,
            @RequestBody CalendarRequest requestDto,
            HttpServletRequest servletRequest) {

        calendarCommandService.createCalendar(groupId, currentUserId, requestDto);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        HttpStatus.CREATED,
                        "일정 등록 성공",
                        servletRequest
                ));
    }

    // 4. 일정 수정
    @PutMapping("/{calendarId}")
    public ResponseEntity<ApiResponse<Void>> updateCalendar(
            @PathVariable Long groupId,
            @PathVariable Long calendarId,
            @AuthenticationPrincipal Long currentUserId,
            @RequestBody CalendarRequest requestDto,
            HttpServletRequest servletRequest) {

        calendarCommandService.updateCalendar(groupId, calendarId, currentUserId, requestDto);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "일정 수정 성공",
                servletRequest
        ));
    }

    // 5. 일정 삭제
    @DeleteMapping("/{calendarId}")
    public ResponseEntity<ApiResponse<Void>> deleteCalendar(
            @PathVariable Long groupId,
            @PathVariable Long calendarId,
            @AuthenticationPrincipal Long currentUserId,
            HttpServletRequest servletRequest) {

        calendarCommandService.deleteCalendar(groupId, calendarId, currentUserId);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "일정 삭제 성공",
                servletRequest
        ));
    }

}