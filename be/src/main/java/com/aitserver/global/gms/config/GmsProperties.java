package com.aitserver.global.gms.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "gms")
public record GmsProperties(
        String baseUrl,
        String apiKey,
        String model
) {}