package com.aitserver.global.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Slf4j
@Configuration
public class RestClientConfig {

    @Value("${fastapi.url}")
    private String fastApiUrl;

    @Bean
    public RestClient fastApiRestClient() {
        // 1. HTTP 1.1 버전을 사용하도록 Java HttpClient 생성 (연결 타임아웃 5초)
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        // 2. JdkClientHttpRequestFactory에 생성한 httpClient 주입 및 응답 읽기 타임아웃 180초 설정
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(180));

        return RestClient.builder()
                .baseUrl(fastApiUrl)
                .requestFactory(requestFactory)
                .defaultHeader("Content-Type", "application/json")
                // 3. FastAPI로 실제로 날아가는 요청 JSON 원문을 로그로 확인하기 위한 Interceptor
                .requestInterceptor((request, body, execution) -> {
                    log.info("[FastAPI 요청 전송 원문] method={}, uri={}, body={}",
                            request.getMethod(),
                            request.getURI(),
                            new String(body, StandardCharsets.UTF_8));
                    return execution.execute(request, body);
                })
                .build();
    }
}