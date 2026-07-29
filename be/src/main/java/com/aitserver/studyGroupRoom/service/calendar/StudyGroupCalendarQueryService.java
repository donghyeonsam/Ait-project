package com.aitserver.studyGroupRoom.service.calendar;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.studyGroupRoom.dto.calendar.CalendarResponse;
import com.aitserver.studyGroupRoom.repository.StudyGroupCalendarRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyGroupCalendarQueryService {

    private final StudyGroupCalendarRepository calendarRepository;
    private final StudyGroupMemberRepository memberRepository;

    //그룹 멤버 확인
    private void validateGroupMember(Long groupId, Long userId) {
        memberRepository.findByStudyGroupIdAndUserId(groupId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_GROUP_MEMBER));
    }

    // 1. 월별 조회 (조회 월 기준 +- 1개월)
    public List<CalendarResponse> getMonthlyCalendars(Long groupId, Long currentUserId, int year, int month) {
        validateGroupMember(groupId, currentUserId);

        YearMonth targetMonth = YearMonth.of(year, month);

        // 시작일: 이전 달의 1일 00:00
        LocalDateTime startOfRange = targetMonth.minusMonths(1).atDay(1).atStartOfDay();

        // 종료일: 다다음 달의 1일 00:00 (Repository 쿼리에서 '<' 조건으로 검색하므로 정확히 다음달 말일 23:59:59까지 가져옵니다)
        LocalDateTime endOfRange = targetMonth.plusMonths(2).atDay(1).atStartOfDay();

        return calendarRepository.findMonthlyCalendars(groupId, startOfRange, endOfRange).stream()
                .map(CalendarResponse::from)
                .collect(Collectors.toList());
    }

    // 2. 일별 조회
    public List<CalendarResponse> getDailyCalendars(Long groupId, Long currentUserId, LocalDate date) {
        validateGroupMember(groupId, currentUserId);

        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime startOfNextDay = date.plusDays(1).atStartOfDay();

        return calendarRepository.findDailyCalendars(groupId, startOfDay, startOfNextDay).stream()
                .map(CalendarResponse::from)
                .collect(Collectors.toList());
    }
}