package com.aitserver.auth.oauthDto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 깃허브 token 엔드포인트 응답.
 * ※ 깃허브는 code가 틀려도 HTTP 200으로 응답하고 body에 error를 담는다 → access_token null 여부로 판단.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GithubTokenResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("token_type") String tokenType,
        @JsonProperty("scope") String scope,
        @JsonProperty("error") String error,
        @JsonProperty("error_description") String errorDescription
) {}