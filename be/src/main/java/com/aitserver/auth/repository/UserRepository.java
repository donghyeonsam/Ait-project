package com.aitserver.auth.repository;

import com.aitserver.auth.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByEmail(String email);

    boolean existsByNickname(String nickname);

    Optional<User> findByEmail(@NotBlank(message = "이메일은 필수 입력 값입니다.") @Email(message = "유효한 이메일 형식이어야 합니다.") String email);

    boolean existsByEmailAndDeletedAtIsNull(String email);
}
