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
                .setAllowedOrigins(
                        "http://localhost:5173",
                        "http://localhost:3000",
                        "https://ait8.vercel.app"
                )
                .withSockJS(); // 브라우저 호환성을 위한 SockJS 안전장치
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
