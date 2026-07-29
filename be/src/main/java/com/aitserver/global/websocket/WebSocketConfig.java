package com.aitserver.global.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompHandler stompHandler;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // 1. 전화선(웹소켓)을 꽂을 '연결 주소' 설정
        registry.addEndpoint("/ws/chat")
                .setAllowedOriginPatterns("*") // CORS 허용 (실전에서는 프론트 도메인만 허용하도록 수정)
                .withSockJS(); // 만약 브라우저가 웹소켓을 지원하지 않으면 대체 기술(HTTP Polling 등)을 쓰게 해주는 안전장치
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 프론트엔드가 "/topic/..." 경로로 구독을 신청하면, 서버가 해당 경로로 메시지를 뿌려줍니다.
        registry.enableSimpleBroker("/topic");

        // 프론트가 "/app/study-groups/1/messages"로 보내면 @MessageMapping이 받습니다.
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompHandler);
    }
}
