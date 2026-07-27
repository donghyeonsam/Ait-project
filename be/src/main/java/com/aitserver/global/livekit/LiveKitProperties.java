package com.aitserver.global.livekit;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "livekit")
public record LiveKitProperties(

        @NotBlank
        String apiUrl,

        @NotBlank
        String wsUrl,

        @NotBlank
        String apiKey,

        @NotBlank
        String apiSecret

) {
}