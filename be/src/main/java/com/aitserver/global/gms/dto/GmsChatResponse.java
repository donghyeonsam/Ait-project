package com.aitserver.global.gms.dto;

import java.util.List;

public record GmsChatResponse(
        List<Choice> choices
) {

    public record Choice(
            Message message
    ) {
    }

    public record Message(
            String role,
            String content
    ) {
    }
}