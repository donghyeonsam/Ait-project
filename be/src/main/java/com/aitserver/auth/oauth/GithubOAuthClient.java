package com.aitserver.auth.oauth;


import com.aitserver.auth.oauthDto.GithubEmail;
import com.aitserver.auth.oauthDto.GithubTokenResponse;
import com.aitserver.auth.oauthDto.GithubUserInfo;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class GithubOAuthClient implements OAuthClient {

    private static final String TOKEN_URI = "https://github.com/login/oauth/access_token";
    private static final String USER_URI = "https://api.github.com/user";
    private static final String EMAIL_URI = "https://api.github.com/user/emails";

    private final RestTemplate restTemplate;

    @Value("${github.client.id}")
    private String clientId;

    @Value("${github.client.secret}")
    private String clientSecret;

    @Value("${github.client.allowed-redirect-uris}")
    private List<String> allowedRedirectUris;

    @Override
    public OAuthProvider getProvider() { return OAuthProvider.GITHUB; }


    @Override
    public OAuthUserInfo getUserInfo(String code, String redirectUri) {
        validateRedirectUri(redirectUri);

        String accessToken = requestAccessToken(code, redirectUri);
        GithubUserInfo ghUser = requestUserInfo(accessToken);

        // email이 비공개면 /user/emails에서 primary+verified 이메일을 가져온다
        String email = ghUser.email();
        if (email == null || email.isBlank()) {
            email = requestPrimaryEmail(accessToken);
        }
        if (email == null || email.isBlank()) {
            log.warn("[GitHubOAuthClient] 검증된 이메일을 찾지 못함 - login: {}", ghUser.login());
            throw new BusinessException(ErrorCode.OAUTH_EMAIL_NOT_VERIFIED);
        }

        // name이 없으면 username(login)으로 대체
        String name = (ghUser.name() != null && !ghUser.name().isBlank())
                ? ghUser.name()
                : ghUser.login();

        return OAuthUserInfo.builder()
                .provider(OAuthProvider.GITHUB)
                .providerId(String.valueOf(ghUser.id()))
                .email(email)
                .name(name)
                .profileImage(ghUser.avatarUrl())
                .build();
    }

    private void validateRedirectUri(String redirectUri) {
        if (redirectUri == null || !allowedRedirectUris.contains(redirectUri)) {
            log.warn("[GitHubOAuthClient] 허용되지 않은 redirect_uri: {}", redirectUri);
            throw new BusinessException(ErrorCode.INVALID_REDIRECT_URI);
        }
    }

    /** 1) 인가 코드 → access token 교환 */
    private String requestAccessToken(String code, String redirectUri) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON)); // JSON 응답 요청 (필수)

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("code", code);
        params.add("redirect_uri", redirectUri);

        try {
            GithubTokenResponse response = restTemplate.postForObject(
                    TOKEN_URI, new HttpEntity<>(params, headers), GithubTokenResponse.class);

            // 깃허브는 code가 틀려도 200 + {"error":...} 로 응답하므로 null 체크로 판단
            if (response == null || response.accessToken() == null) {
                log.warn("[GitHubOAuthClient] 토큰 교환 실패 - error: {}, desc: {}",
                        response != null ? response.error() : "null",
                        response != null ? response.errorDescription() : "null");
                throw new BusinessException(ErrorCode.OAUTH_TOKEN_FAILED);
            }
            return response.accessToken();
        } catch (HttpClientErrorException e) {
            log.warn("[GitHubOAuthClient] 토큰 교환 실패 - status: {}, body: {}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.OAUTH_TOKEN_FAILED);
        } catch (RestClientException e) {
            log.warn("[GitHubOAuthClient] 토큰 교환 실패", e);
            throw new BusinessException(ErrorCode.OAUTH_TOKEN_FAILED);
        }
    }

    /** 2) access token → 사용자 정보 조회 */
    private GithubUserInfo requestUserInfo(String accessToken) {
        try {
            ResponseEntity<GithubUserInfo> response = restTemplate.exchange(
                    USER_URI, HttpMethod.GET, new HttpEntity<>(bearer(accessToken)), GithubUserInfo.class);

            GithubUserInfo body = response.getBody();
            if (body == null) {
                throw new BusinessException(ErrorCode.OAUTH_USERINFO_FAILED);
            }
            return body;
        } catch (RestClientException e) {
            log.warn("[GitHubOAuthClient] 사용자 정보 조회 실패", e);
            throw new BusinessException(ErrorCode.OAUTH_USERINFO_FAILED);
        }
    }

    /** 3) 비공개 이메일 대응 — primary + verified 이메일 조회 */
    private String requestPrimaryEmail(String accessToken) {
        try {
            ResponseEntity<GithubEmail[]> response = restTemplate.exchange(
                    EMAIL_URI, HttpMethod.GET, new HttpEntity<>(bearer(accessToken)), GithubEmail[].class);

            GithubEmail[] emails = response.getBody();
            if (emails == null) return null;

            return Arrays.stream(emails)
                    .filter(e -> e.primary() && e.verified())
                    .map(GithubEmail::email)
                    .findFirst()
                    .orElse(null);
        } catch (RestClientException e) {
            log.warn("[GitHubOAuthClient] 이메일 조회 실패", e);
            throw new BusinessException(ErrorCode.OAUTH_USERINFO_FAILED);
        }
    }

    private HttpHeaders bearer(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setAccept(List.of(MediaType.valueOf("application/vnd.github+json")));
        return headers;
    }
}
