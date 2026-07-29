package com.aitserver.aiInterview.requestDto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FastVoiceAnalysisRequest {
    private byte[] audioData;
}
