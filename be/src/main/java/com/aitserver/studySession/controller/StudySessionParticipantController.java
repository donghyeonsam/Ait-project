package com.aitserver.studySession.controller;


import com.aitserver.global.response.ApiResponse;
import com.aitserver.studySession.dto.MemberResponse;
import com.aitserver.studySession.dto.StudySessionParticipantJoinRequest;
import com.aitserver.studySession.service.StudySessionParticipantService;
import com.aitserver.studySession.service.StudySessionParticipantJoinService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/study-sessions")
public class StudySessionParticipantController {

    private final StudySessionParticipantService participantService;
    private final StudySessionParticipantJoinService participantJoinService;

    // 세션 강퇴 기능(방장만 가능)
    @DeleteMapping("/{sessionId}/participants/{targetUserId}")
    public ResponseEntity<ApiResponse<Void>> kickParticipant(
            @PathVariable Long sessionId,

            @PathVariable Long targetUserId,

            @AuthenticationPrincipal Long userId,

            HttpServletRequest request
    ) {
        participantService.kickParticipant(
                sessionId,
                targetUserId,
                userId
        );

//        return ResponseEntity
//                .noContent()
//                .body();
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "해당 사용자를 강퇴하였습니다.",
                        request
                ));
    }


    // 세션 참가시 사용자 insert + 이력서 자조서id 저장 기능 추가
    @PostMapping("/{sessionId}/participants/me/join")
    public ResponseEntity<ApiResponse<Void>> join(
            @PathVariable Long sessionId,

            @AuthenticationPrincipal Long userId,

            @Valid @RequestBody StudySessionParticipantJoinRequest studySessionParticipantJoinRequest,

            HttpServletRequest request
    ) {
        participantJoinService.join(
                sessionId,
                userId,
                studySessionParticipantJoinRequest
        );

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "입장 대기중 입니다.",
                        request
                ));
    }


    // 멤버 정보 불러오기 + 이력서 자소서 번호
    @GetMapping("/{sessionId}/members")
    public ResponseEntity<ApiResponse<List<MemberResponse>>> getMemberList(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ){
        List<MemberResponse> members =
                participantService.getMemberList(
                        sessionId,
                        userId
                );



        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "세션 참여자 목록 반환을 성공했습니다.",
                        members,
                        request
                ));

    }

}