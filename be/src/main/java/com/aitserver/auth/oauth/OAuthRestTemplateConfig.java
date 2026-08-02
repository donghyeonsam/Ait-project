package com.aitserver.auth.oauth;

import org.springframework.boot.restclient.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class OAuthRestTemplateConfig {

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .connectTimeout(java.time.Duration.ofSeconds(5))  // set 접두어 없음
                .readTimeout(java.time.Duration.ofSeconds(5))
                .build();
    }
}
