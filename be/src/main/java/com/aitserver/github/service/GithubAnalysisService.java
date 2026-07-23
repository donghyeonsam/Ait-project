package com.aitserver.github.service;

import com.aitserver.github.entity.GithubRepo;
import com.aitserver.github.repository.GithubRepoRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GithubAnalysisService {

    private final GithubRepoRepository githubRepoRepository;
    private final GithubTokenService githubTokenService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * FastAPI에 분석을 요청하고 결과를 DB에 저장하는 비동기 메서드
     */
    @Async
    @Transactional
    public void requestAnalysisToFastApi(Long userId, Long repoId, String installationId, String githubUsername, String repoName) {
        log.info("[비동기 분석 시작] 레포지토리: {}, 사용자: {}", repoName, githubUsername);

        try {
            // 1. 깃허브 토큰 발급
            String accessToken = githubTokenService.getInstallationAccessToken(installationId);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);

            // 2. README.md 가져오기 (Raw 텍스트 포맷으로 요청)
            String readmeContent = fetchReadme(githubUsername, repoName, headers);

            // 3. 내 커밋 내역(메시지) 가져오기 (author 파라미터로 내 커밋만 필터링)
            List<String> commitMessages = fetchMyCommits(githubUsername, repoName, headers);

            log.info("수집 완료 - README 길이: {}, 커밋 개수: {}", readmeContent.length(), commitMessages.size());

            String fastApiUrl = "http://localhost:8000/api/v1/embeddings";

            Map<String, Object> githubItem = Map.of(
                    "doc_type", "github",
                    "target_id", repoId,
                    "title", repoName,
                    "content", "Readme: " + readmeContent + "\nCommits: " + commitMessages
            );

            Map<String, Object> requestBody = Map.of(
                    "user_id", userId,
                    "replace", true,
                    "items", List.of(githubItem) // 배열(List) 형태로 감싸서 전달
            );

            ResponseEntity<String> response = restTemplate.postForEntity(fastApiUrl, requestBody, String.class);
            String analysisResult = response.getBody();

            // 5. 분석이 끝나면 DB 업데이트
            GithubRepo githubRepo = githubRepoRepository.findById(repoId)
                    .orElseThrow(() -> new RuntimeException("레포지토리를 찾을 수 없습니다."));

            githubRepo.updateAnalysisContent(analysisResult);
            githubRepoRepository.save(githubRepo);

            log.info("[비동기 분석 완료] 레포지토리 ID: {} 분석 내용 저장 성공", repoId);

        } catch (Exception e) {
            log.error("[비동기 분석 실패] 레포지토리 ID: {} - 에러: {}", repoId, e.getMessage(), e);
        }
    }

    private String fetchReadme(String owner, String repo, HttpHeaders baseHeaders) {
        String url = String.format("https://api.github.com/repos/%s/%s/readme", owner, repo);

        HttpHeaders headers = new HttpHeaders();
        headers.addAll(baseHeaders);
        // 원본 텍스트(마크다운) 그대로 달라고 깃허브 API에 명시
        headers.set("Accept", "application/vnd.github.v3.raw");

        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return response.getBody() != null ? response.getBody() : "";
        } catch (Exception e) {
            log.warn("README가 없거나 가져올 수 없습니다. 레포지토리: {}", repo);
            return "";
        }
    }

    private List<String> fetchMyCommits(String owner, String repo, HttpHeaders headers) {
        String url = String.format("https://api.github.com/repos/%s/%s/commits?author=%s", owner, repo, owner);
        HttpEntity<String> entity = new HttpEntity<>(headers);
        List<String> messages = new ArrayList<>();

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            JsonNode rootNode = objectMapper.readTree(response.getBody());

            for (JsonNode node : rootNode) {
                JsonNode commitNode = node.get("commit");
                if (commitNode != null && commitNode.has("message")) {
                    messages.add(commitNode.get("message").asText());
                }
            }
        } catch (Exception e) {
            log.error("커밋 내역을 가져오는데 실패했습니다. 레포지토리: {}", repo);
        }
        return messages;
    }
}