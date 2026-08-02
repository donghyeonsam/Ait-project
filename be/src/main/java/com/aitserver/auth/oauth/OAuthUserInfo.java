package com.aitserver.auth.oauth;

import lombok.Builder;

/**
 * provider별 응답을 통일한 공통 사용자 정보. (GitHub 확장 시에도 재사용)
 * providerId는 provider 내부 고유 ID이지만 현재 스키마에 저장 컬럼이 없어 로깅/식별 용도로만 쓴다.
 */
@Builder
public record OAuthUserInfo(
        OAuthProvider provider,
        String providerId,
        String email,
        String name,
        String profileImage
) {}