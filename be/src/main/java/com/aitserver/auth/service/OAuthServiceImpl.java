package com.aitserver.auth.service;

import com.aitserver.auth.oauthDto.OAuthLoginResult;
import com.aitserver.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class OAuthServiceImpl implements OAuthService {

    private final UserRepository userRepository;


    @Override
    public OAuthLoginResult login(String provider, String code, String s) {
        return null;
    }

    /** nickname UNIQUE 충돌 시 접미사를 붙여 유니크한 값 생성 (최대 20자) */
    private String generateUniqueNickname(String base) {
        String nickname = base;
        while (userRepository.existsByNickname(nickname)) {
            String suffix = "_" + UUID.randomUUID().toString().substring(0, 4);
            nickname = truncate(base, 20 - suffix.length()) + suffix;
        }
        return nickname;
    }

    private String truncate(String value, int maxLength) {
        if (value == null) return "";
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
