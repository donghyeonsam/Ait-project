package com.aitserver.auth.oauthDto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GoogleUserInfo(
        @JsonProperty("sub") String sub,                    // 구글 계정 고유 ID
        @JsonProperty("email") String email,
        @JsonProperty("email_verified") boolean emailVerified,
        @JsonProperty("name") String name,
        @JsonProperty("picture") String picture
) {}