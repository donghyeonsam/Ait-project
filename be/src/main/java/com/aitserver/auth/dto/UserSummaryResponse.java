package com.aitserver.auth.dto;

import com.aitserver.auth.entity.User;

public record UserSummaryResponse(
        Long userId,
        String email,
        String nickname,
        String role
) {
    public static UserSummaryResponse from(User user) {
        return new UserSummaryResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getRole()
        );
    }
}