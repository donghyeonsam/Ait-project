package com.aitserver.resume.analysis.config;



import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(GmsProperties.class)
public class GmsConfig {

    @Bean
    public RestClient gmsRestClient(
            RestClient.Builder builder,
            GmsProperties properties
    ) {
        validate(properties);

        return builder
                .baseUrl(properties.baseUrl())
                .defaultHeader(
                        HttpHeaders.AUTHORIZATION,
                        "Bearer " + properties.apiKey()
                )
                .defaultHeader(
                        HttpHeaders.CONTENT_TYPE,
                        MediaType.APPLICATION_JSON_VALUE
                )
                .build();
    }

    private void validate(GmsProperties properties) {
        if (properties.apiKey() == null
                || properties.apiKey().isBlank()) {
            throw new IllegalStateException(
                    "GMS_KEY가 설정되지 않았습니다."
            );
        }

        if (properties.baseUrl() == null
                || properties.baseUrl().isBlank()) {
            throw new IllegalStateException(
                    "GMS base URL이 설정되지 않았습니다."
            );
        }

        if (properties.model() == null
                || properties.model().isBlank()) {
            throw new IllegalStateException(
                    "GMS 모델이 설정되지 않았습니다."
            );
        }
    }
}