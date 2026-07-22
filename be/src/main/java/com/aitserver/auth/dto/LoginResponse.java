package com.aitserver.auth.dto;

import com.aitserver.auth.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;

public record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        UserSummaryResponse user,

        @JsonIgnore // 이거 하면 클라이언트로 response 보낼 때 이 부분은 제외되어서 보내진다.
        String refreshToken
) {
    public static LoginResponse of(String accessToken, String refreshToken, long expiresIn, User user) {
        return new LoginResponse(
                accessToken,
                "Bearer",
                expiresIn,
                UserSummaryResponse.from(user),
                refreshToken
        );
    }
}