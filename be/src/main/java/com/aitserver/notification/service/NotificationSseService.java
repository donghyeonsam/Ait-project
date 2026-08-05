package com.aitserver.notification.service;

import com.aitserver.notification.dto.NotificationResponse;
import com.aitserver.notification.repository.EmitterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationSseService {
    private final EmitterRepository emitterRepository;
    private static final Long DEFAULT_TIMEOUT = 60L * 1000 * 60; // 1시간 (연결 유지 시간)

    /**
     * 1. 클라이언트가 SSE 연결을 요청할 때 호출
     */
    public SseEmitter subscribe(Long userId) {
        // Emitter를 구별하기 위해 유저ID_현재시간 조합으로 ID 생성
        String emitterId = userId + "_" + System.currentTimeMillis();
        SseEmitter emitter = emitterRepository.save(emitterId, new SseEmitter(DEFAULT_TIMEOUT));

        ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor();
        ScheduledFuture<?> scheduledFuture = executor.scheduleAtFixedRate(() -> {
            try {
                // SseEmitter comment는 프론트엔드 EventSource 이벤트 수신 로직을 타지 않는 더미 데이터입니다.
                emitter.send(SseEmitter.event().comment("ping"));
            } catch (Exception e) {
                // 전송 실패 시 스케줄러 종료 및 정리
                executor.shutdown();
                emitterRepository.deleteById(emitterId);
            }
        }, 0, 8, TimeUnit.SECONDS);

        // 연결 종료 / 타임아웃 / 에러 시 스케줄러 및 레포지토리 정리
        Runnable cleanup = () -> {
            scheduledFuture.cancel(true);
            executor.shutdown();
            emitterRepository.deleteById(emitterId);
        };

        // 연결 종료 혹은 타임아웃 시 레포지토리에서 안전하게 제거
        emitter.onCompletion(() -> emitterRepository.deleteById(emitterId));
        emitter.onTimeout(() -> emitterRepository.deleteById(emitterId));
        emitter.onError((e) -> emitterRepository.deleteById(emitterId));

        // 최초 연결 데이터
        sendToClient(emitter, emitterId, "EventStream Created. [userId=" + userId + "]");

        return emitter;
    }

    /**
     * 2. 리스너에서 실제 알림이 발생했을 때 클라이언트로 전송
     */
    public void send(Long userId, NotificationResponse response) {
        Map<String, SseEmitter> emitters = emitterRepository.findAllEmitterStartWithByUserId(String.valueOf(userId));

        emitters.forEach((key, emitter) -> {
            sendToClient(emitter, key, response);
        });
    }

    // 실제 데이터를 SseEmitter를 통해 전송하는 공통 메서드
    private void sendToClient(SseEmitter emitter, String emitterId, Object data) {
        try {
            emitter.send(SseEmitter.event()
                    .id(emitterId)
                    .name("notification") // 프론트엔드에서 이 이름(notification)으로 이벤트를 받습니다.
                    .data(data));
        } catch (IOException exception) {
            emitterRepository.deleteById(emitterId);
            log.error("SSE 연결 오류 발생", exception);
        }
    }
}