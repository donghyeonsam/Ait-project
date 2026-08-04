package com.aitserver.studyGroupRoom.dto.group;

import lombok.Getter;

public class GroupDto {
    @Getter
    public static class DelegateRequest {
        private Long targetUserId; // 방장을 위임받을 멤버의 ID
    }
}