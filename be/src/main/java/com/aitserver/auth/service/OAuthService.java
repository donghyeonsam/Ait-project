package com.aitserver.auth.service;

import com.aitserver.auth.oauthDto.OAuthLoginResult;
import jakarta.validation.constraints.NotBlank;

public interface OAuthService {

    OAuthLoginResult login(String provider, @NotBlank(message = "인가 코드는 필수 입력 값입니다.") String code, @NotBlank(message = "redirectUri는 필수 입력 값입니다.") String s);
}
