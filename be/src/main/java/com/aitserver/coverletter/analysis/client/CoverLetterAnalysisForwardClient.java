package com.aitserver.coverletter.analysis.client;

import com.aitserver.coverletter.analysis.dto.CoverLetterAnalysisForwardRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class CoverLetterAnalysisForwardClient {


    // FastAPI 서버 주소

    private static final String FAST_API_BASE_URL =
            "http://192.168.0.10:8000";


    // api 엔드포인트

    private static final String COVER_LETTER_ANALYSIS_PATH =
            "/api/cover-letter-analysis";

    private final RestClient restClient;

    public CoverLetterAnalysisForwardClient() {
        this.restClient = RestClient.builder()
                .baseUrl(FAST_API_BASE_URL)
                .build();
    }

    public void send(
            Long userId,
            Long coverLetterId,
            String analysisContent
    ) {
        CoverLetterAnalysisForwardRequest request =
                new CoverLetterAnalysisForwardRequest(
                        userId,
                        coverLetterId,
                        analysisContent
                );

        restClient.post()
                .uri(COVER_LETTER_ANALYSIS_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .toBodilessEntity();

        log.info(
                "FastAPI 자기소개서 분석 결과 전달 완료. "
                        + "userId={}, coverLetterId={}",
                userId,
                coverLetterId
        );
    }
}