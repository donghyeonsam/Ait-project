package com.aitserver.peerFeedback.service;

import com.aitserver.peerFeedback.dto.*;

import java.util.List;

public interface PeerFeedbackService {

    // id 기반 조회
    PeerFeedbackDetailResponse getPeerFeedbackDetail(Long peerId);

    // 내가 작성한 목록 리턴
    List<PeerFeedbackDetailResponse> getPeerFeedbackWrightList(Long sessionId, Long userId);

    // 내가 받은 목록 리턴
    PeerFeedbackReceiveResponse getPeerFeedbackReceiveList(Long userId, Long sessionId);

    // 작성한 peerFeedback 저장
    PeerFeedbackDetailResponse createPeerFeedback(PeerFeedbackCreateRequest request, Long userId, Long sessionId);

    // 작성한 peerFeedback 수정
    PeerFeedbackDetailResponse updatePeerFeedback(PeerFeedbackUpdateRequest request, Long userId, Long peerFeedbackId);

    // 내가 참여했던 세션 별 리스트
    List<PeerFeedbackListResponse> getPeerFeedbackList(Long userId);

    List<PeerFeedbackListResponse> getPeerFeedbackListLimit(Long userId);

}
