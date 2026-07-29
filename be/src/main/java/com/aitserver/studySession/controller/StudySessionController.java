package com.aitserver.studySession.controller;



import com.aitserver.global.response.ApiResponse;
import com.aitserver.studySession.dto.StudyGroupActiveSessionResponse;
import com.aitserver.studySession.dto.StudySessionConnectionResponse;
import com.aitserver.studySession.dto.StudySessionCreateResponse;
import com.aitserver.studySession.service.StudyGroupActiveSessionService;
import com.aitserver.studySession.service.StudySessionConnectionService;
import com.aitserver.studySession.service.StudySessionEndService;
import com.aitserver.studySession.service.StudySessionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/study-groups")
public class StudySessionController {

    private final StudySessionService studySessionService;
    private final StudySessionConnectionService studySessionConnectionService;
    private final StudySessionEndService studySessionEndService;
    private final StudyGroupActiveSessionService activeSessionService;


    // 방 생성
    @PostMapping("/{groupId}/sessions")
    public ResponseEntity<ApiResponse<StudySessionCreateResponse>>
    createSession(
            @PathVariable Long groupId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        StudySessionCreateResponse response =
                studySessionService.createSession(
                        groupId,
                        userId
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        HttpStatus.CREATED,
                        "방 생성을 성공하였습니다.",
                        response,
                        request
                ));
    }


    // 세션 종료
    @PostMapping("/{sessionId}/end")
    public ResponseEntity<ApiResponse<Void>> endSession(
            @PathVariable Long sessionId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        studySessionEndService.endSession(
                sessionId,
                userId
        );

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "세션이 종료되었습니다.",
                        request
                ));
    }



    @GetMapping("/{groupId}/sessions/active")
    public ResponseEntity<ApiResponse<StudyGroupActiveSessionResponse>>
    getActiveSession(
            @PathVariable Long groupId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ) {
        StudyGroupActiveSessionResponse response =
                activeSessionService.getActiveSession(
                        groupId,
                        userId
                );

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "세션 활성화 여부 조회를 성공했습니다",
                        response,
                        request
                ));
    }



//    // 입장 토큰 발급
//    @PostMapping("/{sessionId}/connection")
//    public ResponseEntity<ApiResponse<StudySessionConnectionResponse>>
//    createConnection(
//            @PathVariable Long sessionId,
//            @AuthenticationPrincipal Long userId,
//            HttpServletRequest request
//    ) {
//        StudySessionConnectionResponse response =
//                studySessionConnectionService
//                        .createConnection(
//                                sessionId,
//                                userId
//                        );
//
//        return ResponseEntity
//                .ok(ApiResponse.success(
//                        HttpStatus.OK,
//                        "토큰 발급 성공했습니다.",
//                        response,
//                        request
//                ));
//    }
}