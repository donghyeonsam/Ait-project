package com.aitserver.aiInterview.client;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
@Slf4j
public class FastApiClient {

    private final RestClient fastApiRestClient;

    public <T, R> R sendToFastApi(String uri, T requestBody, Class<R> responseType) {
        try {
            log.info("[FastAPI 통신 요청] URI: {}, Payload: {}", uri, requestBody);

            R response = fastApiRestClient.post()
                    .uri(uri)
                    .body(requestBody)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        log.error("[FastAPI 통신 에러] Status: {}, URI: {}", res.getStatusCode(), uri);
                        throw new BusinessException(ErrorCode.FASTAPI_SERVER_ERROR);
                    })
                    .body(responseType);

            log.info("[FastAPI 통신 응답 성공] URI: {}", uri);
            return response;

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[FastAPI 통신 시스템 에러] URI: " + uri, e);
            throw new BusinessException(ErrorCode.FASTAPI_SERVER_ERROR);
        }
    }
}