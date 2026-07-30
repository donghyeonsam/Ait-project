package com.aitserver.peerFeedback.service;

import com.aitserver.peerFeedback.dto.PeerFeedbackCreateRequest;
import com.aitserver.peerFeedback.dto.PeerFeedbackDetailResponse;

import java.util.List;

public interface PeerFeedbackService {

    // id 기반 조회
    PeerFeedbackDetailResponse getPeerFeedbackDetail(Long peerId);

    // 내가 작성한 목록 리턴
    List<PeerFeedbackDetailResponse> getPeerFeedbackWrightList(Long sessionId, Long userId);

    // 내가 받은 목록 리턴
    List<PeerFeedbackDetailResponse> getPeerFeedbackReceiveList(Long userId);

    // 작성한 peerFeedback 저장
    PeerFeedbackDetailResponse createPeerFeedback(PeerFeedbackCreateRequest request, Long userId, Long sessionId);

}
