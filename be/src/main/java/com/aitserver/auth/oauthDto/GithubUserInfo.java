package com.aitserver.auth.oauthDto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/** 깃허브 GET /user 응답 (email은 비공개 설정 시 null일 수 있음) */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GithubUserInfo(
        @JsonProperty("id") Long id,               // 깃허브 계정 고유 ID
        @JsonProperty("login") String login,       // 깃허브 username
        @JsonProperty("name") String name,         // 표시 이름 (null 가능)
        @JsonProperty("avatar_url") String avatarUrl,
        @JsonProperty("email") String email        // 비공개면 null
) {}