package com.aitserver.global.config; // 본인 프로젝트 패키지 경로에 맞게 수정

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Value("${spring.data.redis.host}")
    private String host;

    @Value("${spring.data.redis.port}")
    private int port;

    // 💡 yml에 설정한 password를 주입받기 위한 필드 추가
    @Value("${spring.data.redis.password}")
    private String password;

    // RedisConnectionFactory = Redis 서버 연결
    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName(host);
        config.setPort(port);

        // 💡 Redis 비밀번호 설정 추가 (이 부분이 핵심입니다!)
        if (password != null && !password.isBlank()) {
            config.setPassword(password);
        }

        return new LettuceConnectionFactory(config);
    }

    // RedisTemplate 데이터 읽기 / 쓰기 도구
    @Bean
    public RedisTemplate<String, String> redisTemplate() {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory());

        // key를 문자열로 저장
        template.setKeySerializer(new StringRedisSerializer());
        // value를 문자열로 저장
        template.setValueSerializer(new StringRedisSerializer());

        return template;
    }
}