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

    @Value("${fastapi.audioUrl}")
    private String fastApiAudioUrl;

    // 공통 타임아웃 및 요청 팩토리 설정 (코드 중복 방지)
    private JdkClientHttpRequestFactory getRequestFactory() {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(180)); // 분석이 오래 걸릴 수 있으므로 180초 대기
        return requestFactory;
    }

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
                .requestFactory(getRequestFactory())
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

    // 음성 파일 전송 전용 RestClient (예: 8001번 포트)
    @Bean(name = "audioApiRestClient")
    public RestClient audioApiRestClient() {
        return RestClient.builder()
                .baseUrl(fastApiAudioUrl) // application.yml에 설정한 오디오 전용 포트 주소
                .requestFactory(getRequestFactory())
                // 주의: Multipart 전송이므로 application/json 기본 헤더를 넣지 않습니다!
                .requestInterceptor((request, body, execution) -> {
                    // 외계어(바이트 원문) 출력 방지 -> 파일 크기만 출력
                    log.info("[FastAPI Audio 요청] method={}, uri={}, payloadSize={} bytes",
                            request.getMethod(),
                            request.getURI(),
                            body.length);
                    return execution.execute(request, body);
                })
                .build();
    }
}