package com.aitserver.auth.service;

import com.aitserver.auth.dto.SignupRequest;
import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService{

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void insert(SignupRequest signupRequest) {
        // 이메일 중복 확인
        log.info("[AuthService, insert] 이메일 중복 확인 로직 수행");
        if(userRepository.existsByEmail(signupRequest.email())) {
            // 에러 던지기
            log.debug("[AuthService, insert] 이메일 중복 - Email: {}", signupRequest.email());
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }
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
    }
<<<<<<< Updated upstream
=======

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
        // 로그아웃 -> 리프레시 토큰 삭제 -> 엑세스 토큰 블랙 리스트 등록
        log.info("[AuthService, logout] 로그아웃 시도 사용자: {}, accessToken: {}", userId, accessToken);

        // 1. Redis에서 RefreshToken 삭제
        String refreshTokenKey = "RT:" + userId;
        if(Boolean.TRUE.equals(redisTemplate.hasKey(refreshTokenKey))) { // 사용자의 RefreshToken이 존재하면 삭제 처리
            redisTemplate.delete(refreshTokenKey);
            log.info("[AuthService, logout] RefreshToken 삭제 완료");
        }
        // 남은 유효시간 계산
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
    }
>>>>>>> Stashed changes
}
