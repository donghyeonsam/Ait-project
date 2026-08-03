package com.aitserver.auth.oauthDto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/** 깃허브 GET /user/emails 응답 항목 (primary + verified 인 것을 사용) */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GithubEmail(
        @JsonProperty("email") String email,
        @JsonProperty("primary") boolean primary,
        @JsonProperty("verified") boolean verified
) {}