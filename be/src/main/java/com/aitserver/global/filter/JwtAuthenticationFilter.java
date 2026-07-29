package com.aitserver.global.filter;

import com.aitserver.global.jwt.JwtTokenProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final StringRedisTemplate redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        // 1. 헤더에서 토큰 추출
        log.info("[JWT Filter] 사용자 토큰 확인 시작 - Method: {}, URI: {}", request.getMethod(), request.getRequestURI());
        String token = resolveToken(request);

        if(token != null && jwtTokenProvider.validateToken(token)) {
            // 2. Redis 블랙리스트 등록 여부 확인 (로그아웃된 토큰인지 체크)
            Boolean isBlacklisted = redisTemplate.hasKey("BL:" + token); // NPE 방지를 위해 참조타입으로 선언

            if(Boolean.TRUE.equals(isBlacklisted)) {
                log.warn("로그아웃된 토큰으로 접근 시도: {}", token);
                throw new BadCredentialsException("로그아웃된 토큰입니다.");
            }

            // 3. 토큰이 유요하고, 블랙리스트가 아니면 SecurityContext에 인증 정보 저장
            Authentication authentication = jwtTokenProvider.getAuthentication(token);
            // 4. SecurityContext에 저장
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
