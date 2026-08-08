package com.aitserver.github.service;

import com.aitserver.github.entity.GithubRepo;
import com.aitserver.github.repository.GithubAppRepository;
import com.aitserver.github.repository.GithubRepoRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GithubWebhookService {

    private final GithubRepoRepository githubRepoRepository;
    // 깃허브 앱 설정에서 입력할 Webhook Secret (환경변수로 주입)
    @Value("${GITHUB_WEBHOOK_SECRET}")
    private String webhookSecret;

    private final GithubDataService githubDataService;
    private final GithubAppRepository githubAppRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final GithubAnalysisService githubAnalysisService;

    /**
     * 1. HMAC SHA-256 시그니처 검증
     */
    public boolean verifySignature(String payload, String signature) {
        if (signature == null || !signature.startsWith("sha256=")) {
            return false;
        }

        try {
            // HMAC SHA256 암호화 객체 생성
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);

            // 전달받은 payload(JSON 통짜 문자열)를 암호화
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder expectedSignature = new StringBuilder("sha256=");
            for (byte b : hash) {
                expectedSignature.append(String.format("%02x", b)); // Hex(16진수) 문자열로 변환
            }

            // MessageDigest.isEqual을 사용하여 해킹(타이밍 공격) 방지 비교
            return MessageDigest.isEqual(
                    signature.getBytes(StandardCharsets.UTF_8),
                    expectedSignature.toString().getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            log.error("시그니처 검증 중 서버 에러 발생", e);
            return false;
        }
    }

    /**
     * 2. 웹훅 이벤트 파싱 및 동기화 처리
     */
    public void processWebhookEvent(String eventType, String payload) throws Exception {
        if ("ping".equals(eventType)) {
            log.info("GitHub 웹훅 Ping 테스트 완료!");
            return;
        }

        JsonNode rootNode = objectMapper.readTree(payload);
        JsonNode installationNode = rootNode.get("installation");

        if (installationNode == null) {
            return;
        }

        String installationId = installationNode.get("id").asText();

        // 🌟 추가: 이벤트의 구체적인 액션(created, deleted, added, removed 등) 파싱
        String action = rootNode.has("action") ? rootNode.get("action").asText() : "";

        // ==========================================
        // 1. 유저가 깃허브 앱 자체를 Uninstall 한 경우
        // ==========================================
        if ("installation".equals(eventType) && "deleted".equals(action)) {
            log.warn("🚨 깃허브 앱 Uninstall 감지! Installation ID: {}", installationId);

            githubAppRepository.findByInstallationId(installationId).ifPresent(githubApp -> {
                Long userId = githubApp.getUserId();

                // 1. 앱을 지우기 전에 레포지토리 목록을 먼저 가져옵니다. (JPA 메모리에 올라감)
                List<GithubRepo> repos = githubRepoRepository.findByGithubAppId(githubApp.getId());

                // 2. FastAPI에 각 레포지토리의 임베딩 삭제 요청을 보냅니다.
                for (GithubRepo repo : repos) {
                    githubAnalysisService.deleteGithubRepoEmbedding(userId, repo.getId());
                }

                // JPA 메모리 에러(TransientPropertyValueException) 방지를 위해 자식을 먼저 지웁니다!
                if (!repos.isEmpty()) {
                    githubRepoRepository.deleteAll(repos);
                }

                // 부모 삭제
                githubAppRepository.delete(githubApp);

                log.info("🗑유저 ID: {}의 깃허브 연동 데이터(DB) 및 임베딩(FastAPI)이 완전히 삭제되었습니다.", userId);
            });
            return; // 삭제 후 로직 종료
        }

        // ==========================================
        // 2. 유저가 레포지토리 접근 권한만 추가/삭제한 경우
        // ==========================================
        if ("installation_repositories".equals(eventType)) {
            githubAppRepository.findByInstallationId(installationId).ifPresentOrElse(githubApp -> {
                log.info("🔄 레포지토리 변경 감지! 유저 ID: {} 재동기화 시작", githubApp.getUserId());
                githubDataService.syncGithubRepositories(githubApp.getUserId(), installationId);
            }, () -> {
                log.warn("DB에 존재하지 않는 Installation ID의 레포지토리 변경 요청입니다: {}", installationId);
            });
        }
    }
}