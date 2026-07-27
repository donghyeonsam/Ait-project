//package com.aitserver.coverletter.analysis.client;
//
//import com.aitserver.coverletter.analysis.dto.CoverLetterAnalysisForwardRequest;
//import com.aitserver.global.analysis.dto.AnalysisForwardItem;
//import com.aitserver.global.analysis.dto.AnalysisForwardRequest;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.http.MediaType;
//import org.springframework.stereotype.Component;
//import org.springframework.web.client.RestClient;
//
//import java.util.List;
//
//@Slf4j
//@Component
//public class CoverLetterAnalysisForwardClient {
//
//
//    // FastAPI 서버 주소
//
//    private static final String FAST_API_BASE_URL =
//            "http://192.168.100.210:8000";
//
//
//    // api 엔드포인트
//
//    private static final String COVER_LETTER_ANALYSIS_PATH =
//            "/api/v1/embeddings";
//
//    private static final String DOC_TYPE =
//            "cover_letter";
//
//    private final RestClient restClient;
//
//    public CoverLetterAnalysisForwardClient() {
//        this.restClient = RestClient.builder()
//                .baseUrl(FAST_API_BASE_URL)
//                .build();
//    }
//
//    public void send(
//            Long userId,
//            Long coverLetterId,
//            String analysisContent
//    ) {
////        CoverLetterAnalysisForwardRequest request =
////                new CoverLetterAnalysisForwardRequest(
////                        userId,
////                        coverLetterId,
////                        analysisContent
////                );
//
//        AnalysisForwardItem item =
//                new AnalysisForwardItem(
//                        DOC_TYPE,
//                        coverLetterId,
//                        analysisContent
//                );
//
//        AnalysisForwardRequest request =
//                new AnalysisForwardRequest(
//                        userId,
//                        List.of(item)
//                );
//
//        restClient.post()
//                .uri(COVER_LETTER_ANALYSIS_PATH)
//                .contentType(MediaType.APPLICATION_JSON)
//                .body(request)
//                .retrieve()
//                .toBodilessEntity();
//
//        log.info(
//                "FastAPI 자기소개서 분석 결과 전달 완료. "
//                        + "userId={}, docType={}, coverLetterId={}",
//                userId,
//                DOC_TYPE,
//                coverLetterId
//        );
//    }
//}

package com.aitserver.coverletter.analysis.client;

import com.aitserver.global.analysis.dto.AnalysisForwardItem;
import com.aitserver.global.analysis.dto.AnalysisForwardRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.util.List;

@Slf4j
@Component
public class CoverLetterAnalysisForwardClient {

    private static final String COVER_LETTER_ANALYSIS_PATH =
            "/api/v1/embeddings";

    private static final String DOC_TYPE =
            "cover_letter";

    private final RestClient restClient;

    public CoverLetterAnalysisForwardClient(
            RestClient.Builder restClientBuilder,
            @Value("${fastapi.url}") String fastApiBaseUrl
    ) {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();

        JdkClientHttpRequestFactory requestFactory =
                new JdkClientHttpRequestFactory(httpClient);

        this.restClient = restClientBuilder
                .requestFactory(requestFactory)
                .baseUrl(fastApiBaseUrl)
                .build();
    }

    public void send(
            Long userId,
            Long coverLetterId,
            String analysisContent
    ) {
        AnalysisForwardItem item =
                new AnalysisForwardItem(
                        DOC_TYPE,
                        coverLetterId,
                        analysisContent
                );

        AnalysisForwardRequest request =
                new AnalysisForwardRequest(
                        userId,
                        List.of(item)
                );

        restClient.post()
                .uri(COVER_LETTER_ANALYSIS_PATH)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .toBodilessEntity();

        log.info(
                "FastAPI 자기소개서 분석 결과 전달 완료. "
                        + "userId={}, docType={}, targetId={}",
                userId,
                DOC_TYPE,
                coverLetterId
        );
    }
}