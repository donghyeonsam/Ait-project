package com.aitserver.auth.service;

import com.aitserver.auth.dto.LoginRequest;
import com.aitserver.auth.dto.LoginResponse;
import com.aitserver.auth.dto.SignupRequest;
import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.global.jwt.JwtTokenProvider;
import com.aitserver.resume.entity.Resume;
import com.aitserver.resume.repository.ResumeRepository;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService{

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final StringRedisTemplate redisTemplate;
    private final ResumeRepository resumeRepository;
    private final EmailVerificationService emailVerificationService;

    // 일반 회원가입 로직
    @Override
    @Transactional
    public void insert(SignupRequest signupRequest) {
        // 이메일 중복 확인
        log.info("[AuthService, insert] 이메일 중복 확인 로직 수행");
        if(userRepository.existsByEmail(signupRequest.email())) {
            // 에러 던지기
            log.debug("[AuthService, insert] 이메일 중복 - Email: {}", signupRequest.email());
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }

        // 이메일 인증이 완료된 상태인지 여부 확인
        log.info("[AuthService, insert] 이메일 인증 여부 확인 - Email: {}", signupRequest.email());
        emailVerificationService.validateVerifiedEmail(signupRequest.email().trim());


        // 닉네임 중복 확인
        log.info("[AuthService, insert] 닉네임 중복 확인 로직 수행");
        if(userRepository.existsByNickname(signupRequest.nickname())) {
            // 에러 던지기
            log.debug("[AuthService, insert] 닉네임 중복 - Nickname: {}", signupRequest.nickname());
            throw new BusinessException(ErrorCode.DUPLICATE_NICKNAME);
        }
        // 비밀번호 암호화
        String encodedPassword = passwordEncoder.encode(signupRequest.password());
        User user = User.builder()
                .email(signupRequest.email())
                .password(encodedPassword)
                .name(signupRequest.name())
                .nickname(signupRequest.nickname())
                .build();

        User savedUser = userRepository.save(user); // 사용자
        log.info("[AuthService, insert] 회원가입 성공 - Email: {}", savedUser.getEmail());

        // 이력서 PK FK 생성 완료
        resumeRepository.save(new Resume(user));
        log.info("[AuthService, insert] 기본 이력서 PK, FK 생성 완료 - userId, {}", user.getId());

        // 회원 가입이 끝난 후 이메일 인증 완료 상태 삭제
        log.info("[AuthService, insert] 이메일 인증 완료 상태 삭제 - Email: {}", signupRequest.email());
        emailVerificationService.clearVerification(signupRequest.email().trim());
    }

    // 일반 로그인
    @Override
    @Transactional(readOnly = true) // 지연 로딩 예외 예방
    public LoginResponse login(LoginRequest loginRequest) {
        // 이메일을 통해 user를 찾고, 없으면 에러 던지기
        log.info("[AuthService, login] 사용자 로그인 감지: {}", loginRequest.email());
        User user = userRepository.findByEmail(loginRequest.email())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 이메일은 존재하지만, 비밀번호가 다를 경우 에러 던지기
        if(!passwordEncoder.matches(loginRequest.password(), user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_PASSWORD);
        }

        log.info("[AuthService, login] 사용자 정보 존재, 토큰 발급 시작");

        long expireTime = 3600L; // 일단 테스트 편의성을 위해 1시간으로 해놓자
        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());

        log.info("[AuthService, login] Redis에 RefreshToken 저장: {}", refreshToken);
        redisTemplate.opsForValue().set( // redis에 refreshToken 등록, 유효기간을 7일
                "RT:" + user.getId(),
                refreshToken,
                7,
                TimeUnit.DAYS
        );
        return LoginResponse.of(accessToken, refreshToken, expireTime, user);
    }

    // 로그아웃 로직 수행
    @Override
    public void logout(Long userId, String accessToken) {
        log.info("[AuthService, logout] 로그아웃 시도 사용자: {}", userId);
//        revokeTokens(userId, accessToken);

        // 1. Redis에서 RefreshToken 삭제
        String refreshTokenKey = "RT:" + userId;
        if(Boolean.TRUE.equals(redisTemplate.hasKey(refreshTokenKey))) { // 사용자의 RefreshToken이 존재하면 삭제 처리
            redisTemplate.delete(refreshTokenKey);
            log.info("[AuthService, logout] RefreshToken 삭제 완료");
        }
        // 남은 유효시간 계산
        if(StringUtils.hasText(accessToken)) {
            try {
                long expiration = jwtTokenProvider.getExpiration(accessToken);

                if(expiration > 0) { // 아직 시간이 남아있을 경우
                    redisTemplate.opsForValue().set(
                            "BL:" + accessToken,
                            "logout",
                            expiration,
                            TimeUnit.MILLISECONDS
                    );
                    log.info("[AuthService, logout] accessToken 블랙 리스트 등록 완료: {}", accessToken);
                }
            } catch (JwtException e) {
                log.debug("[logout] 이미 만료되었거나 유효하지 않은 토큰, 블랙리스트 등록 생략");
            }
        }
    }

    @Override
    @Transactional(readOnly = true) // 데이터 변경 없이 조회만 하므로 readOnly=true
    public String reissue(String refreshToken) {
        log.info("[AuthService, reissue] AccessToken 재발급 시도");

        if(!StringUtils.hasText(refreshToken)) {
            // refresh token이 전달되지 않은 경우 에러 던지기
            log.warn("[AuthService, reissue] RefreshToken이 존재하지 않습니다.");
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        // 1. Refresh Token 자체의 유효성 검증 (서명, 만료일 등)
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            log.warn("[AuthService, reissue] RefreshToken이 유효하지 않습니다.");
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        // 2. 토큰 안에서 userId 추출
        Long userId = jwtTokenProvider.getUserId(refreshToken);

        // 3. Redis에 저장된 Refresh Token과 일치하는지 대조 (탈취된 예전 토큰 방어)
        String redisToken = redisTemplate.opsForValue().get("RT:" + userId);
        if (!refreshToken.equals(redisToken)) {
            log.warn("[AuthService, reissue] Redis에 저장된 토큰과 해당 RefreshToken이 일치하지 않습니다.");
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        // 4. 새로운 Access Token에 담을 이메일과 역할(Role)을 알기 위해 유저 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 5. 새로운 Access Token 생성 및 반환
        String newAccessToken = jwtTokenProvider.createAccessToken(user.getId(), user.getEmail(), user.getRole());

        log.info("[AuthService, reissue] 새로운 AccessToken 발급 완료 - userId: {}", userId);
        return newAccessToken;
    }

    private void revokeTokens(Long userId, String accessToken) {
        String refreshTokenKey = "RT:" + userId;
        redisTemplate.delete(refreshTokenKey);

        if (!StringUtils.hasText(accessToken)) {
            return;
        }

        long expiration = jwtTokenProvider.getExpiration(accessToken);
        if (expiration > 0) {
            redisTemplate.opsForValue().set(
                    "BL:" + accessToken,
                    "revoked",
                    expiration,
                    TimeUnit.MILLISECONDS
            );
        }
    }
}
