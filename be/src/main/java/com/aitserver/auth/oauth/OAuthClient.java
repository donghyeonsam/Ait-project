package com.aitserver.auth.oauth;

public interface OAuthClient {

    /** 이 구현체가 담당하는 provider */
    OAuthProvider getProvider();

    /**
     * 인가 코드를 access token으로 교환하고 provider에서 사용자 정보를 조회한다.
     * @param code        provider가 발급한 인가 코드
     * @param redirectUri 프론트가 인가 요청에 사용한 redirect_uri (토큰 교환 시 일치 필요)
     */
    OAuthUserInfo getUserInfo(String code, String redirectUri);
}
