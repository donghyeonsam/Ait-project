package com.aitserver.studySession.dto;

import com.aitserver.studySession.entity.StudySessionParticipant;
import com.aitserver.studySession.domain.StudySessionParticipantRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberResponse {

    private Long userId;

    private String nickname;

    private StudySessionParticipantRole role;

    private Long resumeId;

    private Long coverLetterId;



    public static MemberResponse from(
            StudySessionParticipant participant
    ) {
        return MemberResponse.builder()
                .userId(participant.getUser().getId())
                .nickname(participant.getUser().getNickname())
                .role(participant.getRole())
                .resumeId(participant.getResumeId())
                .coverLetterId(participant.getCoverLetterId())
                .build();
    }
}