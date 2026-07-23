package com.aitserver.github.controller;

import com.aitserver.github.dto.GithubRepoResponseDto;
import com.aitserver.github.service.GithubDataService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/github")
public class GithubController {

    private final GithubDataService githubDataService;
//    private final GithubTokenService githubTokenService;
//    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 깃허브 Callback 수신 및 연동 정보 DB 동기화
     */
    @GetMapping("/callback")
    public ResponseEntity<ApiResponse<Void>> githubCallback(
            @RequestParam("installation_id") String installationId,
            HttpServletRequest request) {
        log.info("깃허브 콜백 도착 - Installation ID: {}", installationId);


        // TODO: MVP 테스트용 유저 ID (추후 JWT/Session 에서 추출하도록 변경)
        Long currentUserId = 1L;

        githubDataService.syncGithubRepositories(currentUserId, installationId);

        log.info("레포지토리 동기화 및 DB 저장 성공");

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "깃허브 연동 및 레포지토리 동기화가 완료되었습니다.",
                request
        ));

    }

    /**
     * 내 깃허브 레포지토리 목록 조회 API
     */
    @GetMapping("/repos")
    public ResponseEntity<ApiResponse<List<GithubRepoResponseDto>>> getMyRepos(HttpServletRequest request) {
        Long currentUserId = 1L;

        List<GithubRepoResponseDto> repoList = githubDataService.getSavedRepos(currentUserId);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "레포지토리 목록 조회 성공.",
                repoList,
                request
        ));
    }

    //테스트용 코드
//    @GetMapping("/callback")
//    public ResponseEntity<?> githubCallbackTest(@RequestParam("installation_id") String installationId) {
//        System.out.println("\n====================================");
//        System.out.println("깃허브 콜백 도착");
//        System.out.println("Installation ID: " + installationId);
//        System.out.println("====================================\n");
//
//        try {
//            // 1. 임시 토큰 발급 테스트
//            System.out.println("Access Token 발급 요청 중...");
//            String accessToken = githubTokenService.getInstallationAccessToken(installationId);
//            System.out.println("토큰 발급 성공: " + accessToken.substring(0, 15) + "...\n");
//
//            // 2. 레포지토리 목록 조회 테스트
//            System.out.println("깃허브 레포지토리 목록 조회 중");
//            String repoUrl = "https://api.github.com/installation/repositories";
//            HttpHeaders headers = new HttpHeaders();
//            headers.setBearerAuth(accessToken);
//            headers.set("Accept", "application/vnd.github+json");
//            headers.set("X-GitHub-Api-Version", "2022-11-28");
//
//            HttpEntity<String> entity = new HttpEntity<>(headers);
//            ResponseEntity<Map> response = restTemplate.exchange(repoUrl, HttpMethod.GET, entity, Map.class);
//
//            System.out.println("레포지토리 조회 성공!");
//            System.out.println("전체 데이터: " + response.getBody());
//            System.out.println("\n====================================");
//
//            // 브라우저 화면에도 JSON 결과를 바로 띄워줍니다.
//            return ResponseEntity.ok(response.getBody());
//
//        } catch (Exception e) {
//            System.err.println("에러 발생: " + e.getMessage());
//            e.printStackTrace();
//            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("테스트 실패: 인텔리제이 콘솔 로그를 확인하세요.");
//        }
//    }

}
