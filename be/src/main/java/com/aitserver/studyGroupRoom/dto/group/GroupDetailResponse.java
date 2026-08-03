package com.aitserver.studyGroupRoom.dto.group;

import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.entity.StudyGroupMember;
import lombok.*;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GroupDetailResponse {

    private Long groupId;
    private String title;
    private String description;
    private int currentMemberCount;
    private int capacity;
    private String createdAt;
    private Long ownerId;
    private List<MemberInfo> members;
    private String notice;
    public static GroupDetailResponse from(StudyGroup group) {
        List<MemberInfo> memberInfos = group.getMembers().stream()
                .filter(StudyGroupMember::isActive)
                .map(groupMember -> MemberInfo.from(groupMember, group.getOwner().getId()))
                .toList();

        return GroupDetailResponse.builder()
                .groupId(group.getId())
                .title(group.getTitle())
                .description(group.getDescription())
                .currentMemberCount(group.getMembers().size())
                .capacity(StudyGroup.MAX_CAPACITY)
                .createdAt(group.getCreatedAt().toString())
                .ownerId(group.getOwner().getId())
                .members(memberInfos)
                .notice(group.getChatNotice())
                .build();
    }

    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class MemberInfo {
        private Long userId;
        private String name;
        private String profileImageUrl;
        private boolean isOwner;

        public static MemberInfo from(StudyGroupMember groupMember, Long ownerId) {
            return MemberInfo.builder()
                    .userId(groupMember.getUser().getId())
                    .name(groupMember.getUser().getName())
                    .profileImageUrl(groupMember.getUser().getProfileImage())
                    .isOwner(groupMember.isOwner())
                    .build();
        }
    }
}