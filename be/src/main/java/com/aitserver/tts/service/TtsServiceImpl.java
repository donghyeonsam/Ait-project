package com.aitserver.tts.service;

import com.aitserver.tts.dto.GmsTtsRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Slf4j
@Service
@RequiredArgsConstructor
public class TtsServiceImpl implements TtsService {

    @Qualifier("gmsRestClient") // 필드에 직접 지정
    private final RestClient gmsRestClient;

    public byte[] getTtsAudio(String text) {
        String ttsModel = "gpt-4o-mini-tts";
        String voice = "onyx";

        GmsTtsRequest request = GmsTtsRequest.of(ttsModel, text, voice);

        try {
            return gmsRestClient.post()
                    .uri("/audio/speech")
                    .body(request)
                    .retrieve()
                    .body(byte[].class);

        } catch (RestClientException exception) {
            log.error("GMS TTS API 통신 중 예외 발생", exception);
            throw new IllegalStateException("TTS 음성 변환에 실패했습니다.", exception);
        }
    }
}
