package com.aitserver.global.livekit.controller;


import com.aitserver.global.livekit.service.LiveKitWebhookService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/webhooks")
public class LiveKitWebhookController {

    private static final String WEBHOOK_CONTENT_TYPE =
            "application/webhook+json";

    private final LiveKitWebhookService
            liveKitWebhookService;

    @PostMapping(
            value = "/livekit",
            consumes = WEBHOOK_CONTENT_TYPE
    )
    public ResponseEntity<Void> receiveWebhook(
            @RequestBody String rawBody,
            @RequestHeader(
                    name = "Authorization",
                    required = false
            )
            String authorizationHeader
    ) {
        liveKitWebhookService.receive(
                rawBody,
                authorizationHeader
        );

        return ResponseEntity.ok().build();
    }
}