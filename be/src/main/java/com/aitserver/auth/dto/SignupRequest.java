package com.aitserver.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank(message = "이메일은 필수 입력 값입니다.")
        @Email(message = "유효한 이메일 형식이어야 합니다.")
        @Size(max = 255)
        String email,

        @NotBlank(message = "비밀번호는 필수 입력 값입니다.")
        @Size(min = 8, max = 16)
        String password,

        @NotBlank(message = "이름은 필수 입력 값입니다.")
        @Size(max = 20)
        String name,

        @NotBlank(message = "닉네임은 필수 입력 값입니다.")
        @Size(min = 2, max = 10)
        String nickname
) {}
