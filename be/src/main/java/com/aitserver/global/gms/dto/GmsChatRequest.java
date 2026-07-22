package com.aitserver.global.gms.dto;

import java.util.List;

public record GmsChatRequest(
        String model,
        List<Message> messages
) {

    public static GmsChatRequest of(
            String model,
            String developerPrompt,
            String userPrompt
    ) {
        return new GmsChatRequest(
                model,
                List.of(
                        new Message("developer", developerPrompt),
                        new Message("user", userPrompt)
                )
        );
    }

    public record Message(
            String role,
            String content
    ) {
    }
}