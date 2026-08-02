package com.aitserver.auth.dto;


import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class EmailVerificationResponse {

    private boolean verified;

    public static EmailVerificationResponse success() {
        return EmailVerificationResponse.builder()
                .verified(true)
                .build();
    }
}
