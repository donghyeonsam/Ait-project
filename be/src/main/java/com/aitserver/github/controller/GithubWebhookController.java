package com.aitserver.github.controller;

import com.aitserver.github.service.GithubWebhookService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/github")
public class GithubWebhookController {

    private final GithubWebhookService githubWebhookService;

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestHeader("X-GitHub-Event") String eventType,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestBody String payload) {

        log.info("GitHub Webhook 수신! 이벤트: {}", eventType);

        // 1. HMAC SHA-256 시그니처 검증
        if (!githubWebhookService.verifySignature(payload, signature)) {
            log.error("웹훅 시그니처 검증 실패! 잘못된 요청입니다.");
            return ResponseEntity.badRequest().body("Invalid signature");
        }

        // 2. 페이로드 파싱 및 기존 동기화 로직 재사용
        try {
            githubWebhookService.processWebhookEvent(eventType, payload);
        } catch (Exception e) {
            log.error("웹훅 처리 중 에러 발생: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok("Webhook received");
    }
}