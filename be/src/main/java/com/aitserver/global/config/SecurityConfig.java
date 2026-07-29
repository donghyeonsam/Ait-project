package com.aitserver.global.config;

import java.util.List;

import com.aitserver.global.filter.JwtAuthenticationFilter;
import com.aitserver.global.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;
    private final StringRedisTemplate redisTemplate;

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
                // REST API 개발 단계이므로 CSRF 비활성화
                .csrf(AbstractHttpConfigurer::disable)

                // 프론트엔드의 교차 출처 요청 허용
                .cors(cors ->
                        cors.configurationSource(corsConfigurationSource())
                )

                // 서버 세션에 인증정보를 저장하지 않음
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                // Spring Security 기본 로그인 페이지 비활성화
                .formLogin(AbstractHttpConfigurer::disable)

                // HTTP Basic 인증 비활성화
                .httpBasic(AbstractHttpConfigurer::disable)

                // 현재 개발 단계에서는 모든 요청 허용
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/login",  // 로그인
                                "/api/auth/signup", // 회원가입
                                "/api/auth/reissue",// 토큰 재발급
                                "/swagger-ui/**",   // 스웨거
                                "/v3/api-docs/**",  // 스웨거
                                "/api/webhooks/**"  // 스터디 세션을 위한 라이브킷 웹훅 연결
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(
                        new JwtAuthenticationFilter(jwtTokenProvider, redisTemplate),
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration =
                new CorsConfiguration();

        configuration.setAllowedOrigins(List.of(
                "http://localhost:5174",
                "http://localhost:5173",
                "http://localhost:3000",
                "https://ait-fe-smoky.vercel.app",
                "https://ait8.vercel.app"
        ));

        configuration.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "PATCH", "DELETE",
                "OPTIONS"
        ));

        configuration.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Accept"
        ));

        configuration.setExposedHeaders(
                List.of(
                        "Authorization"
                )
        );

        /*
         * 현재 쿠키 기반 인증을 사용하지 않으므로 false.
         * JWT를 Authorization 헤더로 전달하는 방식에서도 일반적으로 false로 둘 수 있다.
         * 그런데 이제 Refresh Token 전송 및 인증을 사용하니깐 true
         */
        configuration.setAllowCredentials(true);

        // 브라우저가 preflight 결과를 캐싱하는 시간
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
                "/**",
                configuration
        );

        return source;
    }

    @Bean // 비밀번호 암호화를 위한 빈
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}