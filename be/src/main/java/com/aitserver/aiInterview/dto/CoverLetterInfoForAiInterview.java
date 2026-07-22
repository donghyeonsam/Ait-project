package com.aitserver.aiInterview.dto;

import java.time.LocalDateTime;

public record CoverLetterInfoForAiInterview(
        Long id,
        String title,
        String companyName,
        LocalDateTime updatedAt
) {}
