package com.aitserver.aiInterview.requestDto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class NonVerbalDataRequest {

    @JsonProperty("screen_width")
    private Integer screenWidth;

    @JsonProperty("screen_height")
    private Integer screenHeight;

    private Double fps;

    @JsonProperty("duration_sec")
    private Double durationSec;

    private List<FrameData> frames;

    @Getter
    @NoArgsConstructor
    public static class FrameData {
        private Double timestamp;

        @JsonProperty("gaze_x")
        private Double gazeX;

        @JsonProperty("gaze_y")
        private Double gazeY;

        private List<Double> blendshapes; // 52개의 MediaPipe 수치
        private Double ear;
        private Double mar;
    }
}