package com.aitserver.auth.service;

import com.aitserver.auth.entity.SocialUser;
import com.aitserver.user.entity.User;
import com.aitserver.auth.oauth.OAuthClient;
import com.aitserver.auth.oauth.OAuthProvider;
import com.aitserver.auth.oauth.OAuthUserInfo;
import com.aitserver.auth.oauthDto.OAuthLoginResponse;
import com.aitserver.auth.oauthDto.OAuthLoginResult;
import com.aitserver.auth.repository.SocialUserRepository;
import com.aitserver.user.repository.UserRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.global.jwt.JwtTokenProvider;
import com.aitserver.resume.entity.Resume;
import com.aitserver.resume.repository.ResumeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class OAuthServiceImpl implements OAuthService {

    private static final long ACCESS_EXPIRE = 3600L;
    private static final long REFRESH_EXPIRE = 7L;

    private final List<OAuthClient> oAuthClients;
    private final UserRepository userRepository;
    private final SocialUserRepository socialUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final StringRedisTemplate redisTemplate;
    private final ResumeRepository resumeRepository;

    private Map<OAuthProvider, OAuthClient> clientMap;

    private OAuthClient resolveClient(OAuthProvider provider) {
        if (clientMap == null) {
            Map<OAuthProvider, OAuthClient> map = new EnumMap<>(OAuthProvider.class);
            for (OAuthClient client : oAuthClients) {
                map.put(client.getProvider(), client);
            }
            clientMap = map;
        }
        return clientMap.get(provider);
    }

    @Override // 소셜 로그인 진행
    @Transactional
    public OAuthLoginResult login(String providerName, String code, String redirectUri) {
        if (code.contains("%")) {                 // 인코딩된 경우에만 디코딩
            code = URLDecoder.decode(code, StandardCharsets.UTF_8);
        }

        OAuthProvider provider = OAuthProvider.from(providerName);
        log.info("[OAuthService, login] 소셜 로그인 요청 - provider: {}", provider);

        OAuthClient client = resolveClient(provider);
        if (client == null) {
            throw new BusinessException(ErrorCode.UNSUPPORTED_OAUTH_PROVIDER);
        }

        // provider에서 사용자 정보 조회 (외부 호출)
        OAuthUserInfo oAuthUser = client.getUserInfo(code, redirectUri);
        String providerStr = provider.name(); // "GOOGLE", "GITHUB"

        boolean isNewUser = false; // 기본 false에서 조회했더니 신규 유져면 true로 변환

        // 1) (provider, provider_id)로 기존 소셜 계정 조회
        Optional<SocialUser> socialUserOpt =
                socialUserRepository.findByProviderAndProviderId(providerStr, oAuthUser.providerId());

        User user;
        if (socialUserOpt.isPresent()) {
            // 이미 이 provider로 가입/연동된 사용자
            user = socialUserOpt.get().getUser();
            log.info("[OAuthService, login] 기존 소셜 로그인 - userId: {}", user.getId());
        } else {
            // 2) email로 기존 회원 확인 (계정 연동 여부 판단)
            Optional<User> userByEmail = userRepository.findByEmail(oAuthUser.email());

            if (userByEmail.isPresent()) {
                // 이미 (일반가입 또는 다른 provider로) 존재하는 계정 → 이번 provider를 연동만 추가
                user = userByEmail.get();
                log.info("[OAuthService, login] 기존 계정에 소셜 연동 추가 - userId: {}, provider: {}",
                        user.getId(), providerStr);
            } else {
                // 완전 신규 → users 생성 + 기본 이력서
                user = register(oAuthUser);
                isNewUser = true;
                log.info("[OAuthService, login] 소셜 신규 가입 - userId: {}", user.getId());
            }

            // 소셜 계정 연동 정보 저장
            socialUserRepository.save(new SocialUser(user, providerStr, oAuthUser.providerId()));
        }

        // 3) 토큰 발급
        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());

        redisTemplate.opsForValue().set(
                "RT:" + user.getId(),
                refreshToken,
                REFRESH_EXPIRE,
                TimeUnit.DAYS
        );

        OAuthLoginResponse response = OAuthLoginResponse.of(
                accessToken, ACCESS_EXPIRE, isNewUser, user);

        return new OAuthLoginResult(response, refreshToken);
    }

    /** 완전 신규 소셜 회원의 users 생성 (+ 기본 이력서). social_users 연동은 호출부에서 처리 */
    private User register(OAuthUserInfo oAuthUser) {
        String rawName = (oAuthUser.name() != null && !oAuthUser.name().isBlank())
                ? oAuthUser.name()
                : "user";

        User user = User.builder()
                .email(oAuthUser.email())
                .password(passwordEncoder.encode(UUID.randomUUID().toString())) // 랜덤 비밀번호
                .name(truncate(rawName, 20))
                .nickname(generateUniqueNickname(truncate(rawName, 15)))
                .role("USER") // 신규 가입일 때 이미지 저장 안 하는 걸로
//                .profileImage(oAuthUser.profileImage())
                .build();

        User saved = userRepository.save(user);

        // 일반 회원가입과 동일하게 기본 이력서 PK/FK 생성
        resumeRepository.save(new Resume(saved));
        log.info("[OAuthService, register] users 생성 및 기본 이력서 생성 - userId: {}", saved.getId());

        return saved;
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
