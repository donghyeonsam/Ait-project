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
}
