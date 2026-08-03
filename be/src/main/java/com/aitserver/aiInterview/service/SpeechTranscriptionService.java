package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.responseDto.SpeechTranscriptionResponse;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpeechTranscriptionService {

    @Qualifier("gmsRestClient")
    private final RestClient gmsRestClient;

    public SpeechTranscriptionResponse transcribe(MultipartFile media) {
        if (media.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }

        try {
            String filename = media.getOriginalFilename() == null
                    ? "answer.webm"
                    : media.getOriginalFilename();
            byte[] bytes = media.getBytes();
            ByteArrayResource resource = new ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };

            MultipartBodyBuilder bodyBuilder = new MultipartBodyBuilder();
            bodyBuilder.part("file", resource)
                    .filename(filename)
                    .contentType(resolveMediaType(media.getContentType()));
            bodyBuilder.part("model", "whisper-1");
            bodyBuilder.part("language", "ko");

            SpeechTranscriptionResponse response = gmsRestClient.post()
                    .uri("/audio/transcriptions")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(bodyBuilder.build())
                    .retrieve()
                    .body(SpeechTranscriptionResponse.class);

            if (response == null || response.text() == null) {
                throw new BusinessException(ErrorCode.SPEECH_TRANSCRIPTION_FAILED);
            }
            return response;
        } catch (BusinessException exception) {
            throw exception;
        } catch (IOException | RuntimeException exception) {
            log.error("GMS STT API 통신 중 예외 발생", exception);
            throw new BusinessException(ErrorCode.SPEECH_TRANSCRIPTION_FAILED);
        }
    }

    private MediaType resolveMediaType(String contentType) {
        try {
            return contentType == null
                    ? MediaType.APPLICATION_OCTET_STREAM
                    : MediaType.parseMediaType(contentType);
        } catch (IllegalArgumentException exception) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}
