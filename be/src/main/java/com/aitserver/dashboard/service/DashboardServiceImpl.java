package com.aitserver.dashboard.service;


import com.aitserver.aiInterview.repository.AiInterviewsRepository;
import com.aitserver.aiInterview.responseDto.ReportListResponse;
import com.aitserver.dashboard.dto.DashboardResponse;
import com.aitserver.dashboard.dto.MyStudyCalendarResponse;
import com.aitserver.peerFeedback.dto.PeerFeedbackListResponse;

import com.aitserver.peerFeedback.service.PeerFeedbackService;

import com.aitserver.studyGroupRoom.domain.StudyGroupMemberStatus;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.entity.StudyGroupCalendar;
import com.aitserver.studyGroupRoom.repository.StudyGroupCalendarRepository;
import com.aitserver.studySession.repository.StudySessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final AiInterviewsRepository aiInterviewsRepository;
    private final PeerFeedbackService peerFeedbackService;
    private final StudyGroupCalendarRepository studyGroupCalendarRepository;



    @Override
    public DashboardResponse getDashboardResponse(Long userId) {
        // 모의 면접 결과 리스트, 정렬까지 되어있는듯? -> 전체 조회에서 4개만 조회로 변경
        List<ReportListResponse> reportList = aiInterviewsRepository.findReportListByUserIdLimit(userId);

        // 상호 평가 결과 리스트 -> 전체 조회에서 4개만 조회로 변경
        List<PeerFeedbackListResponse> peerFeedbackList = peerFeedbackService.getPeerFeedbackListLimit(userId);

        // 1. 이번주 모의 면접 횟수

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneWeekAgo = now.minusWeeks(1);
        int reportCount = Math.toIntExact(
                reportList.stream()
                        .filter(report -> report.getEndedAt() != null)
                        .filter(report -> {
                            LocalDateTime endedAt = report.getEndedAt();

                            return !endedAt.isBefore(oneWeekAgo)
                                    && !endedAt.isAfter(now);
                        })
                        .count()
        );

        // 2. 최근 모의 면접 종합점수
        Double score = reportList.isEmpty() ? null : reportList.getFirst().getScore();

        // 3. 누적 스터디 참여 횟수
        int studyCount = peerFeedbackList.size();

        // 스터디 스케줄
        List<MyStudyCalendarResponse> studyCalendarList = getMyStudyCalendars(userId);


        return DashboardResponse.builder()
                .interviewCount(reportCount)
                .interviewScore(score)
                .studyCount(studyCount)
                .reportList(reportList)
                .peerFeedbackList(peerFeedbackList)
                .myStudyCalendarList(studyCalendarList)
                .build();

    }


    private List<MyStudyCalendarResponse> getMyStudyCalendars(
            Long userId
    ) {
        ZoneId zoneId = ZoneId.of("Asia/Seoul");

        YearMonth currentMonth =
                YearMonth.now(zoneId);

        LocalDateTime startAt =
                currentMonth
                        .atDay(1)
                        .atStartOfDay();

        LocalDateTime endAt =
                currentMonth
                        .plusMonths(2)
                        .atDay(1)
                        .atStartOfDay();

        List<StudyGroupCalendar> calendars =
                studyGroupCalendarRepository
                        .findMyCalendarsBetween(
                                userId,
                                StudyGroupMemberStatus.ACTIVE,
                                startAt,
                                endAt
                        );

        List<MyStudyCalendarResponse> responses =
                new ArrayList<>();

        for (StudyGroupCalendar calendar : calendars) {
            StudyGroup studyGroup =
                    calendar.getStudyGroup();

            MyStudyCalendarResponse response =
                    MyStudyCalendarResponse.builder()
                            .calendarId(calendar.getId())
                            .groupId(studyGroup.getId())
                            .groupTitle(studyGroup.getTitle())
                            .content(calendar.getContent())
                            .startTime(calendar.getStartTime())
                            .build();

            responses.add(response);
        }

        return responses;
    }
}
