//package com.aitserver.resume.analysis.client;
//
//import com.aitserver.global.analysis.dto.AnalysisForwardItem;
//import com.aitserver.global.analysis.dto.AnalysisForwardRequest;
//import com.aitserver.resume.analysis.dto.ResumeAnalysisForwardRequest;
//import com.fasterxml.jackson.databind.json.JsonMapper;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.http.MediaType;
//import org.springframework.stereotype.Component;
//import org.springframework.web.client.RestClient;
//
//import java.util.List;
//
//@Slf4j
//@Component
//public class ResumeAnalysisForwardClient {
//
//    // ip주소
//    private static final String FAST_API_BASE_URL =
//            "http://192.168.100.210:8000";
//
//    // 엔드포인트
//    private static final String RESUME_ANALYSIS_PATH =
//            "/api/v1/embeddings";
//
//    private static final String DOC_TYPE =
//            "resume";
//
//    private final RestClient restClient;
//
//
//    public ResumeAnalysisForwardClient() {
//        this.restClient = RestClient.builder()
//                .baseUrl(FAST_API_BASE_URL)
//                .build();
//    }
//
//
//
//    public void send(
//            Long userId,
//            Long resumeId,
//            String analysisContent
//    ) {
////        ResumeAnalysisForwardRequest request =
////                new ResumeAnalysisForwardRequest(
////                        userId,
////                        resumeId,
////                        analysisContent
////                );
//        AnalysisForwardItem item =
//                new AnalysisForwardItem(
//                        DOC_TYPE,
//                        resumeId,
//                        analysisContent
//                );
//
//        AnalysisForwardRequest request =
//                new AnalysisForwardRequest(
//                        userId,
//                        List.of(item)
//                );
//
//
//        restClient.post()
//                .uri(RESUME_ANALYSIS_PATH)
//                .contentType(MediaType.APPLICATION_JSON)
//                .body(request)
//                .retrieve()
//                .toBodilessEntity();
//
//        log.info(
//                "FastAPI 이력서 분석 결과 전달 완료. userId={}, docType={}, resumeId={}",
//                userId,
//                DOC_TYPE,
//                resumeId
//        );
//    }
//}
package com.aitserver.resume.analysis.client;

import com.aitserver.global.analysis.dto.AnalysisForwardItem;
import com.aitserver.global.analysis.dto.AnalysisForwardRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@Component
public class ResumeAnalysisForwardClient {

    private static final String FAST_API_BASE_URL =
            "http://192.168.100.210:8000";

    private static final String RESUME_ANALYSIS_PATH =
            "/api/v1/embeddings";

    private static final String DOC_TYPE = "resume";

    private final RestClient restClient;

    public ResumeAnalysisForwardClient(
            RestClient.Builder restClientBuilder
    ) {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();

        JdkClientHttpRequestFactory requestFactory =
                new JdkClientHttpRequestFactory(httpClient);

        this.restClient = restClientBuilder
                // 이 부분이 기존 코드에서 빠져 있었음
                .requestFactory(requestFactory)
                .baseUrl(FAST_API_BASE_URL)
                .requestInterceptor((httpRequest, body, execution) -> {
                    log.info(
                            "FastAPI 실제 요청 method={}, uri={}, contentType={}, bodyLength={}, body={}",
                            httpRequest.getMethod(),
                            httpRequest.getURI(),
                            httpRequest.getHeaders().getContentType(),
                            body.length,
                            new String(body, StandardCharsets.UTF_8)
                    );

                    return execution.execute(httpRequest, body);
                })
                .build();
    }

    public void send(
            Long userId,
            Long resumeId,
            String analysisContent
    ) {
        AnalysisForwardItem item =
                new AnalysisForwardItem(
                        DOC_TYPE,
                        resumeId,
                        analysisContent
                );

        AnalysisForwardRequest request =
                new AnalysisForwardRequest(
                        userId,
                        List.of(item)
                );

        restClient.post()
                .uri(RESUME_ANALYSIS_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .toBodilessEntity();

        log.info(
                "FastAPI 이력서 분석 결과 전달 완료. userId={}, docType={}, targetId={}",
                userId,
                DOC_TYPE,
                resumeId
        );
    }
}