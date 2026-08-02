package com.aitserver.auth.oauthDto;

import com.aitserver.auth.dto.UserSummaryResponse;
import com.aitserver.auth.entity.User;

public record OAuthLoginResponse(
        String accessToken,
        long expireTime,
        boolean isNewUser,
        UserSummaryResponse user
) {
    public static OAuthLoginResponse of(String accessToken, long expireTime, boolean isNewUser, User user) {
        return new OAuthLoginResponse(
                accessToken,
                expireTime,
                isNewUser,
                UserSummaryResponse.from(user)
        );
    }
}