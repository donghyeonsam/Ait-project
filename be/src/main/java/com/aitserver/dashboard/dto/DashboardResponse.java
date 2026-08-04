package com.aitserver.dashboard.dto;


import com.aitserver.aiInterview.responseDto.ReportListResponse;
import com.aitserver.peerFeedback.dto.PeerFeedbackListResponse;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
public class DashboardResponse {


    // 이번주 모의 면접 횟수
    private Integer interviewCount;

    // 최근 모의 면접 종합 점수
    private Double interviewScore;

    // 누적 스터디 참여 횟수
    private Integer studyCount;

    // 모의 면접 기록 리스트
    List<ReportListResponse> reportList;

    // 상호평가 리스트
    List<PeerFeedbackListResponse> peerFeedbackList;

    // 스터디 일정
    List<MyStudyCalendarResponse>  myStudyCalendarList;




}
