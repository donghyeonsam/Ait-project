package com.aitserver.auth.oauth;


import com.aitserver.auth.oauthDto.GoogleTokenResponse;
import com.aitserver.auth.oauthDto.GoogleUserInfo;
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

import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class GoogleOAuthClient implements OAuthClient{

    private static final String TOKEN_URI = "https://oauth2.googleapis.com/token";
    private static final String USERINFO_URI = "https://www.googleapis.com/oauth2/v3/userinfo";

    private final RestTemplate restTemplate;

    @Value("${google.client.id}")
    private String clientId;

    @Value("${google.client.secret}")
    private String clientSecret;

    @Value("${google.client.allowed-redirect-uris}")
    private List<String> allowedRedirectUris;

    @Override
    public OAuthProvider getProvider() {
        return OAuthProvider.GOOGLE;
    }

    @Override
    public OAuthUserInfo getUserInfo(String code, String redirectUri) {
        validateRedirectUri(redirectUri);

        String accessToken = requestAccessToken(code, redirectUri);
        GoogleUserInfo googleUser = requestUserInfo(accessToken);

        if (googleUser.email() == null || !googleUser.emailVerified()) {
            log.warn("[GoogleOAuthClient] 구글 이메일 미검증 - sub: {}", googleUser.sub());
            throw new BusinessException(ErrorCode.OAUTH_EMAIL_NOT_VERIFIED);
        }

        return OAuthUserInfo.builder()
                .provider(OAuthProvider.GOOGLE)
                .providerId(googleUser.sub())
                .email(googleUser.email())
                .name(googleUser.name())
                .profileImage(googleUser.picture())
                .build();
    }

    private void validateRedirectUri(String redirectUri) {
        if (redirectUri == null || !allowedRedirectUris.contains(redirectUri)) {
            log.warn("[GoogleOAuthClient] 허용되지 않은 redirect_uri: {}", redirectUri);
            throw new BusinessException(ErrorCode.INVALID_REDIRECT_URI);
        }
    }

    /** 1) 인가 코드 → access token 교환 */
    private String requestAccessToken(String code, String redirectUri) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("code", code);
        params.add("client_id", clientId);
        params.add("client_secret", clientSecret);
        params.add("redirect_uri", redirectUri);
        params.add("grant_type", "authorization_code");

        try {
            GoogleTokenResponse response = restTemplate.postForObject(
                    TOKEN_URI, new HttpEntity<>(params, headers), GoogleTokenResponse.class);

            if (response == null || response.accessToken() == null) {
                throw new BusinessException(ErrorCode.OAUTH_TOKEN_FAILED);
            }
            return response.accessToken();

        } catch (HttpClientErrorException e) {
            // 구글이 준 실제 에러 본문 (invalid_grant / redirect_uri_mismatch / invalid_client 등)
            log.warn("[GoogleOAuthClient] 토큰 교환 실패 - status: {}, body: {}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.OAUTH_TOKEN_FAILED);
        } catch (RestClientException e) {
            // 만료/재사용된 code, redirect_uri 불일치 등
            log.warn("[GoogleOAuthClient] access token 교환 실패", e);
            throw new BusinessException(ErrorCode.OAUTH_TOKEN_FAILED);
        }
    }

    /** 2) access token → 사용자 정보 조회 */
    private GoogleUserInfo requestUserInfo(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        try {
            ResponseEntity<GoogleUserInfo> response = restTemplate.exchange(
                    USERINFO_URI, HttpMethod.GET, new HttpEntity<>(headers), GoogleUserInfo.class);

            GoogleUserInfo body = response.getBody();
            if (body == null) {
                throw new BusinessException(ErrorCode.OAUTH_USERINFO_FAILED);
            }
            return body;
        } catch (RestClientException e) {
            log.warn("[GoogleOAuthClient] 사용자 정보 조회 실패", e);
            throw new BusinessException(ErrorCode.OAUTH_USERINFO_FAILED);
        }
    }
}
