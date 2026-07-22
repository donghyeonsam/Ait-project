package com.aitserver.resume.analysis.dto;

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