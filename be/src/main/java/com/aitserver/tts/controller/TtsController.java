package com.aitserver.tts.controller;

import com.aitserver.global.response.ApiResponse;
import com.aitserver.tts.dto.TtsRequest;
import com.aitserver.tts.dto.TtsResponse;
import com.aitserver.tts.service.TtsService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tts")
@RequiredArgsConstructor
public class TtsController {

    private final TtsService ttsService;

    @PostMapping
    public ResponseEntity<ApiResponse<TtsResponse>> textToSpeech(
            @RequestBody TtsRequest question,
            HttpServletRequest request) {

        byte[] audioData = ttsService.getTtsAudio(question.getQuestion()); // 텍스트를 오디오로 변환

        TtsResponse response = TtsResponse.builder()
                .audioData(audioData)
                .build();

        return ResponseEntity.status(HttpStatus.OK).body(
                ApiResponse.success(
                        HttpStatus.OK,
                        "TTS 변환 완료",
                        response,
                        request
                )
        );
    }

    // 테스트용 (공통 응답 폼을 거치지 않고 바로 byte[] 리턴)
    @PostMapping(value = "/test", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public byte[] testTextToSpeech(@RequestBody TtsRequest request) {
        return ttsService.getTtsAudio(request.getQuestion());
    }
}