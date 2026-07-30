package com.aitserver.aiInterview.client;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
@Slf4j
public class FastApiClient {

    private final RestClient fastApiRestClient;
    private final RestClient audioApiRestClient;

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
    // 오디오를 보내기 위한 메서드임
    public <R> R sendAudioToFastApi(String uri, byte[] audioBytes, String filename, String requestId, Class<R> responseType) {
        try {
            log.info("[FastAPI 오디오 전송] URI: {}, Filename: {}", uri, filename);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

            // getFilename()을 오버라이딩해야 FastAPI가 파일로 인식합니다.
            ByteArrayResource audioResource = new ByteArrayResource(audioBytes) {
                @Override
                public String getFilename() {
                    return filename; // 예: "audio.webm"
                }
            };

            // "file"이라는 파라미터 이름으로 오디오 자원을 폼에 추가 (FastAPI의 변수명과 일치해야 함)
            body.add("file", audioResource);
            body.add("request_id", requestId);

            R response = audioApiRestClient.post()
                    .uri(uri)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        log.error("[FastAPI 음성 파일 전송 중 통신 에러] Status: {}, URI: {}", res.getStatusCode(), uri);
                        throw new BusinessException(ErrorCode.FASTAPI_SERVER_ERROR);
                    })
                    .body(responseType);

            log.info("[FastAPI 오디오 전송 성공] URI: {}", uri);
            return response;

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[FastAPI 오디오 전송 시스템 에러] URI: " + uri, e);
            throw new BusinessException(ErrorCode.FASTAPI_SERVER_ERROR);
        }
    }
}