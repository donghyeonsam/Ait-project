package com.aitserver.github.controller;

import com.aitserver.github.entity.GithubApp;
import com.aitserver.github.entity.GithubRepo;
import com.aitserver.github.service.GithubDataService;
import com.aitserver.github.service.GithubTokenService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class GithubController {

    private final GithubTokenService githubTokenService;
    private final GithubDataService githubDataService;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 깃허브 Callback 수신 및 연동 정보 DB 저장
     */
    /**
     * [즉시 확인용 테스트 API]
     * 깃허브에서 Install 버튼을 누르면 이 주소로 리다이렉트 됩니다.
     */
    @GetMapping("/github/callback")
    public ResponseEntity<?> githubCallbackTest(@RequestParam("installation_id") String installationId) {
        System.out.println("\n====================================");
        System.out.println("깃허브 콜백 도착");
        System.out.println("Installation ID: " + installationId);
        System.out.println("====================================\n");

        try {
            // 1. 임시 토큰 발급 테스트
            System.out.println("Access Token 발급 요청 중...");
            String accessToken = githubTokenService.getInstallationAccessToken(installationId);
            System.out.println("토큰 발급 성공: " + accessToken.substring(0, 15) + "...\n");

            // 2. 레포지토리 목록 조회 테스트
            System.out.println("깃허브 레포지토리 목록 조회 중");
            String repoUrl = "https://api.github.com/installation/repositories";
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.set("Accept", "application/vnd.github+json");
            headers.set("X-GitHub-Api-Version", "2022-11-28");

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(repoUrl, HttpMethod.GET, entity, Map.class);

            System.out.println("레포지토리 조회 성공!");
            System.out.println("전체 데이터: " + response.getBody());
            System.out.println("\n====================================");

            // 브라우저 화면에도 JSON 결과를 바로 띄워줍니다.
            return ResponseEntity.ok(response.getBody());

        } catch (Exception e) {
            System.err.println("에러 발생: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("테스트 실패: 인텔리제이 콘솔 로그를 확인하세요.");
        }
    }
}
