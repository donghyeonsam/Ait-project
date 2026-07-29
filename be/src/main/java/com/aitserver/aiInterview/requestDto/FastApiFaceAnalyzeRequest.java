package com.aitserver.aiInterview.requestDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class FastApiFaceAnalyzeRequest {

    private Double fps;

    @JsonProperty("duration_sec")
    private Double durationSec;

    private List<FastApiFrameData> frames;

    @Builder
    public FastApiFaceAnalyzeRequest(Double fps, Double durationSec, List<FastApiFrameData> frames) {
        this.fps = fps;
        this.durationSec = durationSec;
        this.frames = frames;
    }

    @Getter
    @NoArgsConstructor
    public static class FastApiFrameData {
        private List<Double> blendshapes;
        private Double ear;
        private Double mar;
        private Double deviation; // Spring Boot에서 계산해서 넣어줄 시선 이탈률

        @Builder
        public FastApiFrameData(List<Double> blendshapes, Double ear, Double mar, Double deviation) {
            this.blendshapes = blendshapes;
            this.ear = ear;
            this.mar = mar;
            this.deviation = deviation;
        }
    }
}