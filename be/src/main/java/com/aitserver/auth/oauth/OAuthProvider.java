package com.aitserver.auth.oauth;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;

/**
 * 지원하는 소셜 로그인 provider.
 * users 테이블에 provider 컬럼이 없으므로 DB 저장용이 아니라 요청 라우팅용으로만 사용한다.
 */
public enum OAuthProvider {
    GOOGLE,
    GITHUB; // 다음 단계

    public static OAuthProvider from(String value) {
        try {
            return OAuthProvider.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            // ErrorCode에 UNSUPPORTED_OAUTH_PROVIDER 등을 추가해서 사용
            throw new BusinessException(ErrorCode.UNSUPPORTED_OAUTH_PROVIDER);
        }
    }
}