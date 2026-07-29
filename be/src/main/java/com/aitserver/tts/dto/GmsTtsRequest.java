package com.aitserver.tts.dto;

public record GmsTtsRequest(
        String model,
        String input,
        String voice,
        String response_format
) {
    // 기본적으로 mp3 포맷을 사용하도록 팩토리 메서드 생성
    public static GmsTtsRequest of(String model, String input, String voice) {
        return new GmsTtsRequest(
                model,
                input,
                voice,
                "mp3"
        );
    }
}