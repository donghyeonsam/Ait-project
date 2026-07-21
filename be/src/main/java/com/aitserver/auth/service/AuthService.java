package com.aitserver.auth.service;

import com.aitserver.auth.dto.SignupRequest;

public interface AuthService {

    void insert(SignupRequest signupRequest);
}
