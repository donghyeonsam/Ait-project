package com.aitserver.auth.service;

import com.aitserver.auth.dto.SignupRequest;

public interface AuthService {

    void insert(SignupRequest signupRequest);
<<<<<<< Updated upstream
=======

    LoginResponse login(@Valid LoginRequest loginRequest);

    void logout(Long userId, String accessToken);
>>>>>>> Stashed changes
}
