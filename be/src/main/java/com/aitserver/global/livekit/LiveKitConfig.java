package com.aitserver.global.livekit;

import io.livekit.server.LiveKitAPI;
import io.livekit.server.WebhookReceiver;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(LiveKitProperties.class)
public class LiveKitConfig {

    @Bean
    public LiveKitAPI liveKitAPI(
            LiveKitProperties properties
    ) {
        return LiveKitAPI.createClient(
                properties.apiUrl(),
                properties.apiKey(),
                properties.apiSecret()
        );
    }

    @Bean
    public WebhookReceiver webhookReceiver(
            LiveKitProperties properties
    ) {
        return new WebhookReceiver(
                properties.apiKey(),
                properties.apiSecret()
        );
    }
}