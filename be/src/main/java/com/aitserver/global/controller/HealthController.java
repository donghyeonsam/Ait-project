package com.aitserver.global.controller;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.global.response.ApiResponse;
//import com.ssafy.nighttrip.global.response.ValidationTestRequest;
//import com.ssafy.nighttrip.global.security.jwt.JwtTokenProvider;
import com.aitserver.user.service.UserPurgeWorker;
import jakarta.servlet.http.HttpServletRequest;
//import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneId;



@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class HealthController {

//    private final JwtTokenProvider jwtTokenProvider;

    private static final ZoneId ZONE_ID =
            ZoneId.of("Asia/Seoul");

    private final UserPurgeWorker userPurgeWorker;

    // 서버 동작 테스트 + 공통 응답 형식 테스트
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> health(HttpServletRequest request) {
        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "서버 상태 확인 성공",
                        "OK",
                        request
                ));
    }

    // businessException globalExceptionHandler 테스트
    @GetMapping("/health/business-error")
    public ResponseEntity<ApiResponse<Void>> businessError() {
        throw new BusinessException(ErrorCode.USER_NOT_FOUND);
    }

    // runtimeException globalExceptionHandler 테스트
    @GetMapping("/health/server-error")
    public ResponseEntity<ApiResponse<Void>> serverError() {
        throw new RuntimeException("테스트용 서버 예외입니다.");
    }


    @DeleteMapping("/users/{userId}/purge")
    public ResponseEntity<ApiResponse<Boolean>> purgeUser(
            @PathVariable Long userId,
            HttpServletRequest request
    ) {
        LocalDateTime cutoff =
                LocalDateTime.now(ZONE_ID);

        boolean deleted =
                userPurgeWorker.purgeUser(
                        userId,
                        cutoff
                );

        if (!deleted) {
            return ResponseEntity
                    .status(HttpStatus.OK)
                    .body(ApiResponse.success(
                            HttpStatus.OK,
                            "영구 삭제 대상 회원이 아닙니다.",
                            false,
                            request
                    ));
        }

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "회원 영구 삭제 테스트 성공",
                        true,
                        request
                ));
    }


    // validation 테스트
//    @PostMapping("/health/validation-error")
//    public ResponseEntity<ApiResponse<String>> validationError(
//            @Valid @RequestBody ValidationTestRequest requestDto,
//            HttpServletRequest request
//    ) {
//        return ResponseEntity
//                .status(HttpStatus.OK)
//                .body(ApiResponse.success(
//                        HttpStatus.OK,
//                        "검증 성공",
//                        requestDto.getName(),
//                        request
//                ));
//    }

//    // 토큰 발급 확인
//    @GetMapping("/health/jwt")
//    public ResponseEntity<ApiResponse<String>> jwt(HttpServletRequest request) {
//        String accessToken = jwtTokenProvider.createAccessToken(1L, "USER");
//
//        return ResponseEntity
//                .status(HttpStatus.OK)
//                .body(ApiResponse.success(
//                        HttpStatus.OK,
//                        "JWT 생성 성공",
//                        accessToken,
//                        request
//                ));
//    }
//
//    // 인증 확인용 api
//    @GetMapping("/api/test/me")
//    public ResponseEntity<ApiResponse<Long>> me(
//            Authentication authentication,
//            HttpServletRequest request
//    ) {
//        Long userId = (Long) authentication.getPrincipal();
//
//        return ResponseEntity
//                .status(HttpStatus.OK)
//                .body(ApiResponse.success(
//                        HttpStatus.OK,
//                        "인증 사용자 확인 성공",
//                        userId,
//                        request
//                ));
//    }
//
//    // 403 테스트
//    @GetMapping("/api/admin/test")
//    public ResponseEntity<ApiResponse<Long>> amIAdmin(
//            Authentication authentication,
//            HttpServletRequest request
//    ) {
//        Long userId = (Long) authentication.getPrincipal();
//
//        return ResponseEntity
//                .status(HttpStatus.OK)
//                .body(ApiResponse.success(
//                        HttpStatus.OK,
//                        "인증 사용자 확인 성공",
//                        userId,
//                        request
//                ));
//    }
//
//
//    // 임시 패스워드 발급용
//    private final PasswordEncoder passwordEncoder;
//
//    @GetMapping("/health/password")
//    public String password() {
//        return passwordEncoder.encode("12345678");
//    }
//
//
}