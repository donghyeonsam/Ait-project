package com.aitserver.auth.service;

import com.aitserver.auth.dto.LoginRequest;
import com.aitserver.auth.dto.LoginResponse;
import com.aitserver.auth.dto.SignupRequest;
import jakarta.validation.Valid;

public interface AuthService {

    void insert(SignupRequest signupRequest);

    LoginResponse login(@Valid LoginRequest loginRequest);

    void logout(Long userId, String accessToken);
}
