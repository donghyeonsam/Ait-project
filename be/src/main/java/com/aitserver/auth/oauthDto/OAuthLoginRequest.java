package com.aitserver.auth.oauthDto;

import jakarta.validation.constraints.NotBlank;

public record OAuthLoginRequest(
        @NotBlank(message = "인가 코드는 필수 입력 값입니다.")
        String code,

        @NotBlank(message = "redirectUri는 필수 입력 값입니다.")
        String redirectUri
) {}