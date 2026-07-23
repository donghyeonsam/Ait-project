package com.aitserver.github.service;

import com.aitserver.github.entity.GithubRepo;
import com.aitserver.github.repository.GithubRepoRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class GithubAnalysisService {

    private final GithubRepoRepository githubRepoRepository;
    private final GithubTokenService githubTokenService;
    private final RestClient restClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public GithubAnalysisService(
            GithubRepoRepository githubRepoRepository,
            GithubTokenService githubTokenService,
            RestClient.Builder restClientBuilder
    ) {
        this.githubRepoRepository = githubRepoRepository;
        this.githubTokenService = githubTokenService;

        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);

        this.restClient = restClientBuilder
                .requestFactory(requestFactory)
                .requestInterceptor((httpRequest, body, execution) -> {
                    log.info("[API 요청] method={}, uri={}, contentType={}, bodyLength={}",
                            httpRequest.getMethod(),
                            httpRequest.getURI(),
                            httpRequest.getHeaders().getContentType(),
                            body.length
                    );
                    return execution.execute(httpRequest, body);
                })
                .build();
    }

    /**
     * FastAPI에 분석을 요청하고 결과를 DB에 저장하는 비동기 메서드
     */
    @Async
    @Transactional
    public void requestAnalysisToFastApi(Long userId, Long repoId, String installationId, String githubUsername, String repoName) {
        log.info("[비동기 분석 시작] 레포지토리: {}, 사용자: {}", repoName, githubUsername);

        try {
            String accessToken = githubTokenService.getInstallationAccessToken(installationId);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);

            String readmeContent = fetchReadme(githubUsername, repoName, headers);

            List<String> commitMessages = fetchMyCommits(githubUsername, repoName, headers);

            log.info("수집 완료 - README 길이: {}, 커밋 개수: {}", readmeContent.length(), commitMessages.size());

            String fastApiUrl = "http://192.168.100.210:8000/api/v1/embeddings";

            Map<String, Object> githubItem = Map.of(
                    "doc_type", "github",
                    "target_id", repoId,
                    "title", repoName,
                    "content", "Readme: " + readmeContent + "\nCommits: " + commitMessages
            );

            Map<String, Object> requestBody = Map.of(
                    "user_id", userId,
                    "replace", true,
                    "items", List.of(githubItem)
            );

            String analysisResult = restClient.post()
                    .uri(fastApiUrl)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

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

        try {
            return restClient.get()
                    .uri(url)
                    .headers(httpHeaders -> {
                        httpHeaders.addAll(baseHeaders);
                        httpHeaders.set("Accept", "application/vnd.github.v3.raw");
                    })
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.warn("README가 없거나 가져올 수 없습니다. 레포지토리: {}", repo);
            return "";
        }
    }

    private List<String> fetchMyCommits(String owner, String repo, HttpHeaders baseHeaders) {
        String url = String.format("https://api.github.com/repos/%s/%s/commits?author=%s", owner, repo, owner);
        List<String> messages = new ArrayList<>();

        try {
            String responseBody = restClient.get()
                    .uri(url)
                    .headers(httpHeaders -> httpHeaders.addAll(baseHeaders))
                    .retrieve()
                    .body(String.class);

            JsonNode rootNode = objectMapper.readTree(responseBody);
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