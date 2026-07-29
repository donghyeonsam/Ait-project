package com.aitserver.global.websocket;

import com.aitserver.global.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class StompHandler implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        // 메시지를 STOMP 포맷으로 감싸서 헤더에 쉽게 접근할 수 있게 만듭니다.
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        // 1. STOMP 연결(CONNECT) 시도일 때만 토큰을 검사합니다.
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {

            // 2. 프론트엔드가 STOMP CONNECT 헤더에 담아 보낸 Authorization 값을 추출합니다.
            String bearerToken = accessor.getFirstNativeHeader("Authorization");

            if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
                String token = bearerToken.substring(7);

                // 3. 토큰 유효성 검증
                if (jwtTokenProvider.validateToken(token)) {
                    // 4. 토큰에서 유저 정보(Authentication)를 뽑아내어 웹소켓 세션에 저장(세팅)합니다.
                    Authentication authentication = jwtTokenProvider.getAuthentication(token);
                    accessor.setUser(authentication);
                } else {
                    // 유효하지 않은 토큰일 경우 예외 처리
                    throw new IllegalArgumentException("유효하지 않은 JWT 토큰입니다.");
                }
            } else {
                throw new IllegalArgumentException("JWT 토큰이 존재하지 않습니다.");
            }
        }

        return message; // 그대로 메시지 통과
    }
}