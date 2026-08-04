package com.aitserver.aiInterview.client;

import com.aitserver.aiInterview.dto.DeleteEmbeddingItemRequest;
import com.aitserver.aiInterview.dto.DeleteEmbeddingsRequest;
import com.aitserver.aiInterview.dto.DeleteEmbeddingsResponse;
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

import java.util.List;

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
    // 오디오를 보내기 위한 메서드.
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

    public <R> R sendFaceDataToFastApi(String uri, Object body, Class<R> responseType) {
        try {
            log.info("[FastAPI 표정 데이터 전송] URI: {}", uri);
            return audioApiRestClient.post()
                    .uri(uri)
                    .body(body)
                    .retrieve()
                    .body(responseType);
        } catch (Exception e) {
            log.error("[FastAPI 표정 데이터 전송 시스템 에러] URI: " + uri, e);
            throw new BusinessException(ErrorCode.FASTAPI_SERVER_ERROR);
        }
    }

    public void deleteUserEmbeddings(Long userId) {

        String uri = "/api/v1/embeddings/{userId}";

        try {
            log.info(
                    "[FastAPI 사용자 임베딩 삭제 요청] URI: {}, userId: {}",
                    uri,
                    userId
            );

            fastApiRestClient.delete()
                    .uri(uri, userId)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        log.error(
                                "[FastAPI 사용자 임베딩 삭제 에러] Status: {}, URI: {}, userId: {}",
                                res.getStatusCode(),
                                uri,
                                userId
                        );

                        throw new BusinessException(
                                ErrorCode.FASTAPI_SERVER_ERROR
                        );
                    })
                    .toBodilessEntity();

            log.info(
                    "[FastAPI 사용자 임베딩 삭제 성공] userId: {}",
                    userId
            );

        } catch (BusinessException e) {
            throw e;

        } catch (Exception e) {
            log.error(
                    "[FastAPI 사용자 임베딩 삭제 시스템 에러] userId: {}",
                    userId,
                    e
            );

            throw new BusinessException(
                    ErrorCode.FASTAPI_SERVER_ERROR
            );
        }
    }


    public DeleteEmbeddingsResponse deleteCoverLetterEmbedding(
            Long userId,
            Long coverLetterId
    ) {
        String uri = "/api/v1/embeddings/delete";

        DeleteEmbeddingItemRequest item =
                DeleteEmbeddingItemRequest.builder()
                        .docType("cover_letter")
                        .targetId(coverLetterId)
                        .build();

        DeleteEmbeddingsRequest requestBody =
                DeleteEmbeddingsRequest.builder()
                        .userId(userId)
                        .items(List.of(item))
                        .build();

        try {
            log.info(
                    "[FastAPI 자기소개서 임베딩 삭제 요청] " +
                            "URI: {}, userId: {}, coverLetterId: {}",
                    uri,
                    userId,
                    coverLetterId
            );

            DeleteEmbeddingsResponse response =
                    fastApiRestClient.post()
                            .uri(uri)
                            .contentType(MediaType.APPLICATION_JSON)
                            .accept(MediaType.APPLICATION_JSON)
                            .body(requestBody)
                            .retrieve()
                            .onStatus(
                                    HttpStatusCode::isError,
                                    (req, res) -> {
                                        log.error(
                                                "[FastAPI 자기소개서 임베딩 삭제 에러] " +
                                                        "Status: {}, URI: {}, " +
                                                        "userId: {}, coverLetterId: {}",
                                                res.getStatusCode(),
                                                uri,
                                                userId,
                                                coverLetterId
                                        );

                                        throw new BusinessException(
                                                ErrorCode.FASTAPI_SERVER_ERROR
                                        );
                                    }
                            )
                            .body(DeleteEmbeddingsResponse.class);

            if (response == null) {
                log.error(
                        "[FastAPI 자기소개서 임베딩 삭제 응답 없음] " +
                                "userId: {}, coverLetterId: {}",
                        userId,
                        coverLetterId
                );

                throw new BusinessException(
                        ErrorCode.FASTAPI_SERVER_ERROR
                );
            }

            log.info(
                    "[FastAPI 자기소개서 임베딩 삭제 성공] " +
                            "userId: {}, coverLetterId: {}, " +
                            "requestedCount: {}, deleted: {}",
                    userId,
                    coverLetterId,
                    response.getRequestedCount(),
                    response.isDeleted()
            );

            return response;

        } catch (BusinessException e) {
            throw e;

        } catch (Exception e) {
            log.error(
                    "[FastAPI 자기소개서 임베딩 삭제 시스템 에러] " +
                            "userId: {}, coverLetterId: {}",
                    userId,
                    coverLetterId,
                    e
            );

            throw new BusinessException(
                    ErrorCode.FASTAPI_SERVER_ERROR
            );
        }
    }
}