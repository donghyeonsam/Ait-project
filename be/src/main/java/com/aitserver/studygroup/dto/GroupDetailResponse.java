package com.aitserver.studygroup.dto;

import com.aitserver.studygroup.entity.StudyGroup;
import com.aitserver.studygroup.entity.StudyGroupMember;
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

    public static GroupDetailResponse from(StudyGroup group) {
        List<MemberInfo> memberInfos = group.getMembers().stream()
                .map(groupMember -> MemberInfo.from(groupMember, group.getOwnerId()))
                .toList();

        return GroupDetailResponse.builder()
                .groupId(group.getId())
                .title(group.getTitle())
                .description(group.getDescription())
                .currentMemberCount(group.getMembers().size())
                .capacity(group.getCapacity())
                .createdAt(group.getCreatedAt().toString())
                .ownerId(group.getOwnerId())
                .members(memberInfos)
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
                    .isOwner(groupMember.getUser().getId().equals(ownerId))
                    .build();
        }
    }
}