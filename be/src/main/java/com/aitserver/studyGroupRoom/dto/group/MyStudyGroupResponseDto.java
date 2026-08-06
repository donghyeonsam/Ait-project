package com.aitserver.studyGroupRoom.dto.group;

import com.aitserver.studyGroupRoom.domain.StudyGroupStatus;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.entity.StudyGroupMember;
import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
public class MyStudyGroupResponseDto {
    private Long id;
    private String title;
    private String description;
    private List<String> profileImageUrls;
    private int capacity;
    private int currentMemberCount;
    private StudyGroupStatus groupStatus;
    private boolean isOwner;

    // StudyGroupMember 엔티티를 받아서 변환
    public static MyStudyGroupResponseDto from(StudyGroupMember member) {
        StudyGroup group = member.getStudyGroup();

        List<String> imageUrls = group.getMembers().stream()
                .map(m -> m.getUser().getProfileImage())
                 .limit(4)
                .collect(Collectors.toList());

        return MyStudyGroupResponseDto.builder()
                .id(group.getId())
                .title(group.getTitle())
                .description(group.getDescription())
                .profileImageUrls(imageUrls)
                .capacity(StudyGroup.MAX_CAPACITY)
                .currentMemberCount(group.getCurrentMemberCount())
                .groupStatus(group.getStatus())
                .isOwner(member.isOwner())
                .build();
    }
}