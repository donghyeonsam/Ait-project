package com.aitserver.github.service;

import com.aitserver.github.entity.GithubRepo;
import com.aitserver.github.repository.GithubRepoRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
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

    @Value("${GMS_BASE_URL}")
    private String gmsBaseUrl;

    @Value("${GMS_API_KEY}")
    private String gmsApiKey;

    @Value("${GMS_MODEL}")
    private String gmsModel;

    @Value("${FASTAPI_URL}")
    private String fastAPI_URL;
    /**
     * FastAPI에 분석을 요청하고 결과를 DB에 저장하는 비동기 메서드
     */
    @Async
    @Transactional
    public void requestAnalysisToFastApi(Long userId, Long repoId, String installationId, String githubUsername, String repoName) {
        log.info("[비동기 분석 시작] 레포지토리: {}, 사용자: {}", repoName, githubUsername);

        try {
            // 1. 깃허브 데이터 수집
            String accessToken = githubTokenService.getInstallationAccessToken(installationId);
            HttpHeaders githubHeaders = new HttpHeaders();
            githubHeaders.setBearerAuth(accessToken);

            String readmeContent = fetchReadme(githubUsername, repoName, githubHeaders);
            List<String> commitMessages = fetchMyCommits(githubUsername, repoName, githubHeaders);

            log.info("깃허브 수집 완료 - README 길이: {}, 커밋 개수: {}", readmeContent.length(), commitMessages.size());

            // 2. GMS 호출을 위한 데이터 구성
            String rawGithubData = "README:\n" + readmeContent + "\n\nCOMMITS:\n" + String.join("\n", commitMessages);
            String systemPrompt = getGithubAnalysisPrompt();

            // OpenAI 규격(표준)의 Request Body 가정
            Map<String, Object> gmsRequestBody = Map.of(
                    "model", gmsModel,
                    "response_format", Map.of("type", "json_object"), // JSON으로만 응답하도록 강제
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt),
                            Map.of("role", "user", "content", "깃허브 데이터:\n" + rawGithubData)
                    ),
                    "temperature", 0.1
            );

            // 3. GMS API 호출하여 요약(구조화된 JSON) 받아오기
            log.info("[GMS 요약 요청 시작] 모델: {}", gmsModel);
            String gmsResponse = restClient.post()
                    .uri(gmsBaseUrl + "/chat/completions") // GMS API 스펙에 따라 엔드포인트 수정 필요
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + gmsApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(gmsRequestBody)
                    .retrieve()
                    .body(String.class);

            // GMS 응답에서 실제 JSON 결과물(content)만 파싱
            String structuredJsonData = extractContentFromGmsResponse(gmsResponse);
            log.info("[GMS 요약 완료] 정제된 JSON 데이터 생성 성공");

            // 4. FastAPI로 전송
            String fastApiUrl = fastAPI_URL+"/api/v1/embeddings";

            Map<String, Object> githubItem = Map.of(
                    "doc_type", "github",
                    "target_id", repoId,
                    "title", repoName,
                    "content", structuredJsonData
            );

            Map<String, Object> requestBody = Map.of(
                    "user_id", userId,
                    "replace", true,
                    "items", List.of(githubItem)
            );

            log.info("[FastAPI 임베딩 요청 시작]");
            String analysisResult = restClient.post()
                    .uri(fastApiUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            // 5. DB 업데이트
            GithubRepo githubRepo = githubRepoRepository.findById(repoId)
                    .orElseThrow(() -> new RuntimeException("레포지토리를 찾을 수 없습니다."));

            githubRepo.updateAnalysisContent(structuredJsonData);

            githubRepoRepository.save(githubRepo);

            log.info("[비동기 분석 및 임베딩 완료] 레포지토리 ID: {} 전체 파이프라인 성공", repoId);

        } catch (Exception e) {
            log.error("[비동기 분석 실패] 레포지토리 ID: {} - 에러: {}", repoId, e.getMessage(), e);
        }
    }

    // GMS API 응답(JSON)에서 'content' 텍스트만 뽑아내는 헬퍼 메서드 (Jackson ObjectMapper 사용)
    private String extractContentFromGmsResponse(String gmsResponseJson) {
        try {
            JsonNode root = objectMapper.readTree(gmsResponseJson);
            return root.path("choices")
                    .get(0)
                    .path("message")
                    .path("content")
                    .asText();
        } catch (Exception e) {
            log.error("GMS 응답 파싱 실패", e);
            throw new RuntimeException("GMS 응답에서 JSON 추출을 실패했습니다.", e);
        }
    }

    private String getGithubAnalysisPrompt() {
        try {
            // src/main/resources/prompts/github_analysis_prompt.txt 파일을 지정
            ClassPathResource resource = new ClassPathResource("prompts/github_analysis_prompt.txt");

            // 파일 내용을 UTF-8 문자열로 읽어서 반환
            return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

        } catch (IOException e) {
            log.error("프롬프트 파일을 읽어오는데 실패했습니다. 경로를 확인해주세요.", e);
            throw new RuntimeException("프롬프트 파일 로드 실패", e);
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