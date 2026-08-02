package com.aitserver.auth.oauthDto;

public record OAuthLoginResult(
        OAuthLoginResponse response,
        String refreshToken
) {}