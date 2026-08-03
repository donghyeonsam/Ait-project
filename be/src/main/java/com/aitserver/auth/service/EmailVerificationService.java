package com.aitserver.auth.service;


import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.user.repository.UserRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final Duration CODE_EXPIRATION = Duration.ofMinutes(5);

    private static final Duration VERIFIED_EXPIRATION = Duration.ofMinutes(30);

    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);

    private static final Duration FAILURE_COUNT_EXPIRATION = Duration.ofMinutes(5);

    private static final int MAX_FAILURE_COUNT = 5;

    private static final String CODE_KEY_PREFIX =
            "email:verification:code:";

    private static final String VERIFIED_KEY_PREFIX =
            "email:verification:verified:";

    private static final String COOLDOWN_KEY_PREFIX =
            "email:verification:cooldown:";

    private static final String FAILURE_KEY_PREFIX =
            "email:verification:failure:";

    private final JavaMailSender javaMailSender;
    private final StringRedisTemplate redisTemplate;
    private final UserRepository userRepository;

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${spring.mail.username}")
    private String senderEmail;

    /**
     * 이메일 인증번호를 발송한다.
     */
    public void sendVerificationCode(String rawEmail) {

        String email = normalizeEmail(rawEmail);

        validateEmailNotRegistered(email);
        validateResendCooldown(email);

        String verificationCode =
                generateVerificationCode();

        String hashedCode =
                hashCode(email, verificationCode);

        /*
         * 같은 이메일로 재발송하면 이전 인증번호는
         * 자동으로 덮어써져서 사용할 수 없게 된다.
         */
        redisTemplate.opsForValue().set(
                codeKey(email),
                hashedCode,
                CODE_EXPIRATION
        );

        /*
         * 새로운 인증번호가 발급되면 이전 인증 완료 상태는 제거한다.
         */
        redisTemplate.delete(verifiedKey(email));
        redisTemplate.delete(failureKey(email));

        try {
            sendMail(email, verificationCode);
        } catch (MailException | MessagingException exception) {

            /*
             * 메일 발송이 실패했는데 Redis에는 인증번호가 남아 있으면
             * 사용자는 받지도 못한 인증번호를 기다리게 된다.
             */
            redisTemplate.delete(codeKey(email));
            redisTemplate.delete(cooldownKey(email));

            log.error(
                    "이메일 인증번호 발송 실패. email={}",
                    email,
                    exception
            );

            throw new BusinessException(
                    ErrorCode.EMAIL_SEND_FAILED
            );
        }
    }

    /**
     * 사용자가 입력한 인증번호를 검증한다.
     */
    public void verifyCode(
            String rawEmail,
            String verificationCode
    ) {

        String email = normalizeEmail(rawEmail);

        String savedCodeHash =
                redisTemplate.opsForValue().get(
                        codeKey(email)
                );

        if (savedCodeHash == null) {
            throw new BusinessException(
                    ErrorCode.EMAIL_VERIFICATION_CODE_EXPIRED
            );
        }

        String requestedCodeHash =
                hashCode(email, verificationCode);

        if (!isSameHash(
                savedCodeHash,
                requestedCodeHash
        )) {
            handleVerificationFailure(email);
        }

        /*
         * 인증번호는 한 번 성공하면 다시 사용할 수 없도록 삭제한다.
         */
        redisTemplate.delete(
                List.of(
                        codeKey(email),
                        failureKey(email)
                )
        );

        /*
         * 회원가입 요청에서 확인하기 위한 인증 완료 상태.
         */
        redisTemplate.opsForValue().set(
                verifiedKey(email),
                "true",
                VERIFIED_EXPIRATION
        );
    }

    /**
     * 회원가입 전에 이메일 인증이 완료되었는지 확인한다.
     */
    public void validateVerifiedEmail(
            String rawEmail
    ) {

        String email = normalizeEmail(rawEmail);

        String verified =
                redisTemplate.opsForValue().get(
                        verifiedKey(email)
                );

        if (!Objects.equals(verified, "true")) {
            throw new BusinessException(
                    ErrorCode.EMAIL_NOT_VERIFIED
            );
        }
    }

    /**
     * 회원가입 성공 후 인증 완료 상태를 삭제한다.
     */
    public void clearVerification(
            String rawEmail
    ) {

        String email = normalizeEmail(rawEmail);

        redisTemplate.delete(
                verifiedKey(email)
        );
    }

    private void validateEmailNotRegistered(
            String email
    ) {

        /*
         * 프로젝트의 UserRepository 메서드 이름에 맞게 변경하면 된다.
         *
         * 탈퇴 처리된 회원을 제외해야 한다면:
         * existsByEmailAndDeletedAtIsNull(email)
         */
        if (userRepository.existsByEmailAndDeletedAtIsNull(email)) {
            throw new BusinessException(
                    ErrorCode.EMAIL_ALREADY_EXISTS
            );
        }
    }

    private void validateResendCooldown(
            String email
    ) {

        Boolean success =
                redisTemplate.opsForValue().setIfAbsent(
                        cooldownKey(email),
                        "true",
                        RESEND_COOLDOWN
                );

        if (!Boolean.TRUE.equals(success)) {
            throw new BusinessException(
                    ErrorCode.EMAIL_RESEND_TOO_FAST
            );
        }
    }

    private void handleVerificationFailure(
            String email
    ) {

        Long failureCount =
                redisTemplate.opsForValue().increment(
                        failureKey(email)
                );

        if (failureCount != null
                && failureCount == 1L) {

            redisTemplate.expire(
                    failureKey(email),
                    FAILURE_COUNT_EXPIRATION
            );
        }

        if (failureCount != null
                && failureCount >= MAX_FAILURE_COUNT) {

            redisTemplate.delete(
                    List.of(
                            codeKey(email),
                            failureKey(email)
                    )
            );

            throw new BusinessException(
                    ErrorCode.EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED
            );
        }

        throw new BusinessException(
                ErrorCode.EMAIL_VERIFICATION_CODE_MISMATCH
        );
    }

    private void sendMail(
            String receiverEmail,
            String verificationCode
    ) throws MessagingException {

        MimeMessage message =
                javaMailSender.createMimeMessage();

        MimeMessageHelper helper =
                new MimeMessageHelper(
                        message,
                        false,
                        StandardCharsets.UTF_8.name()
                );

        helper.setFrom(senderEmail);
        helper.setTo(receiverEmail);
        helper.setSubject(
                "[AIT] 회원가입 이메일 인증번호"
        );

        String htmlContent = """
                <!DOCTYPE html>
                <html lang="ko">
                <body style="font-family: Arial, sans-serif;">
                    <div style="
                        max-width: 500px;
                        margin: 0 auto;
                        padding: 30px;
                        border: 1px solid #dddddd;
                        border-radius: 12px;
                    ">
                        <h2>이메일 인증</h2>

                        <p>
                            회원가입을 위한 인증번호입니다.
                        </p>

                        <div style="
                            margin: 30px 0;
                            padding: 20px;
                            background-color: #f5f5f5;
                            border-radius: 8px;
                            text-align: center;
                            font-size: 32px;
                            font-weight: bold;
                            letter-spacing: 8px;
                        ">
                            %s
                        </div>

                        <p>
                            인증번호는 5분 동안 유효합니다.
                        </p>

                        <p style="
                            color: #777777;
                            font-size: 13px;
                        ">
                            본인이 요청하지 않았다면
                            이 메일을 무시해주세요.
                        </p>
                    </div>
                </body>
                </html>
                """.formatted(verificationCode);

        helper.setText(htmlContent, true);

        javaMailSender.send(message);
        log.info("이메일 전송 완료");
    }

    private String generateVerificationCode() {

        int number =
                secureRandom.nextInt(1_000_000);

        return String.format("%06d", number);
    }

    private String hashCode(
            String email,
            String verificationCode
    ) {

        String value =
                email + ":" + verificationCode;

        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hashedBytes =
                    digest.digest(
                            value.getBytes(
                                    StandardCharsets.UTF_8
                            )
                    );

            return toHex(hashedBytes);

        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(
                    "SHA-256 알고리즘을 사용할 수 없습니다.",
                    exception
            );
        }
    }

    private boolean isSameHash(
            String savedHash,
            String requestedHash
    ) {

        return MessageDigest.isEqual(
                savedHash.getBytes(
                        StandardCharsets.UTF_8
                ),
                requestedHash.getBytes(
                        StandardCharsets.UTF_8
                )
        );
    }

    private String toHex(byte[] bytes) {

        StringBuilder builder =
                new StringBuilder();

        for (byte value : bytes) {
            builder.append(
                    String.format("%02x", value)
            );
        }

        return builder.toString();
    }

    private String normalizeEmail(
            String email
    ) {

        return email
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private String codeKey(String email) {
        return CODE_KEY_PREFIX + email;
    }

    private String verifiedKey(String email) {
        return VERIFIED_KEY_PREFIX + email;
    }

    private String cooldownKey(String email) {
        return COOLDOWN_KEY_PREFIX + email;
    }

    private String failureKey(String email) {
        return FAILURE_KEY_PREFIX + email;
    }
}