package com.aitserver.resume.analysis.client;

import com.aitserver.resume.analysis.dto.ResumeAnalysisForwardRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class ResumeAnalysisForwardClient {

    // ip주소
    private static final String FAST_API_BASE_URL =
            "http://192.168.0.10:8000";

    // 엔드포인트
    private static final String RESUME_ANALYSIS_PATH =
            "/api/resume-analysis";

    private final RestClient restClient;

    public ResumeAnalysisForwardClient() {
        this.restClient = RestClient.builder()
                .baseUrl(FAST_API_BASE_URL)
                .build();
    }

    public void send(
            Long userId,
            Long resumeId,
            String analysisContent
    ) {
        ResumeAnalysisForwardRequest request =
                new ResumeAnalysisForwardRequest(
                        userId,
                        resumeId,
                        analysisContent
                );

        restClient.post()
                .uri(RESUME_ANALYSIS_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .toBodilessEntity();

        log.info(
                "FastAPI 이력서 분석 결과 전달 완료. userId={}, resumeId={}",
                userId,
                resumeId
        );
    }
}