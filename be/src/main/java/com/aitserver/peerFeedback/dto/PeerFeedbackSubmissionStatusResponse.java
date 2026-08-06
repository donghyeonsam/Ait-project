package com.aitserver.peerFeedback.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class PeerFeedbackSubmissionStatusResponse {

    // 모든 참여자가 평가를 전부 제출했는지
    private boolean allSubmitted;

    // 본인이 작성해야 할 평가를 전부 제출하지 않은 사용자 닉네임
    private List<String> incompleteUserNicknames;
}