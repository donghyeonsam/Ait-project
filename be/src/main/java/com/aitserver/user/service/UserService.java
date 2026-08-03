package com.aitserver.user.service;

import com.aitserver.aiInterview.client.FastApiClient;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.global.jwt.JwtTokenProvider;
import com.aitserver.user.dto.ChangePasswordRequest;
import com.aitserver.user.dto.WithdrawRequest;
import com.aitserver.user.entity.User;
import com.aitserver.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final StringRedisTemplate redisTemplate;
    private final FastApiClient fastApiClient;



    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {

        // 1. 사용자 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.USER_NOT_FOUND)
                );

        // 2. 현재 비밀번호 확인
        boolean currentPasswordMatches =
                passwordEncoder.matches(
                        request.getOldPassword(),
                        user.getPassword()
                );

        if (!currentPasswordMatches) {
            throw new BusinessException(
                    ErrorCode.INVALID_CURRENT_PASSWORD
            );
        }

        // 3. 새 비밀번호와 확인 비밀번호 일치 여부 확인
        if (!request.getNewPassword()
                .equals(request.getConfirmNewPassword())) {

            throw new BusinessException(
                    ErrorCode.PASSWORD_CONFIRM_NOT_MATCH
            );
        }

        // 4. 기존 비밀번호와 새 비밀번호가 동일한지 확인
        boolean sameAsCurrentPassword =
                passwordEncoder.matches(
                        request.getNewPassword(),
                        user.getPassword()
                );

        if (sameAsCurrentPassword) {
            throw new BusinessException(
                    ErrorCode.SAME_AS_CURRENT_PASSWORD
            );
        }

        // 5. 새 비밀번호 암호화
        String encodedNewPassword =
                passwordEncoder.encode(
                        request.getNewPassword()
                );

        // 6. 엔티티 변경
        user.changePassword(encodedNewPassword);

    }



    @Transactional
    public void withdraw(
            Long userId,
            WithdrawRequest request
    ) {
        // 1. 탈퇴하지 않은 사용자 조회
        User user = userRepository
                .findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.USER_NOT_FOUND)
                );

        // 2. 현재 비밀번호 확인
        boolean passwordMatches =
                passwordEncoder.matches(
                        request.getPassword(),
                        user.getPassword()
                );

        if (!passwordMatches) {
            throw new BusinessException(
                    ErrorCode.INVALID_CURRENT_PASSWORD
            );
        }

        // 3. 소프트 삭제
        user.withdraw();

        // 4. 닉네임과 이메일 앞에 deleted_붙이기
        user.anonymizeForWithdrawal();

        // 5. fastapi 삭제 메서드 호출
        fastApiClient.deleteUserEmbeddings(userId);

    }






}
