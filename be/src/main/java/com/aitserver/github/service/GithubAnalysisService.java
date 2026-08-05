package com.aitserver.github.service;

import com.aitserver.github.entity.GithubRepo;
import com.aitserver.github.repository.GithubRepoRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
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
import java.util.Set;

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

    // 우리가 찾고자 하는 타겟 핵심 파일명 리스트 (확장 가능)
    private static final Set<String> TARGET_FILES = Set.of(
            "package.json",
            "build.gradle",
            "pom.xml",
            "requirements.txt",
            "docker-compose.yml",
            "Dockerfile",
            "application.yml"
    );

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
            List<String> keyFilesContent = fetchTargetFiles(githubUsername, repoName, githubHeaders);

            log.info("깃허브 수집 완료 - README 길이: {}, 커밋 개수: {}, 주요 파일 개수: {}",
                    readmeContent.length(), commitMessages.size(), keyFilesContent.size());

            StringBuilder rawGithubDataBuilder = new StringBuilder();
            rawGithubDataBuilder.append("README:\n").append(readmeContent).append("\n\n");

            rawGithubDataBuilder.append("KEY FILES CONFIG:\n");
            for (String fileContent : keyFilesContent) {
                rawGithubDataBuilder.append(fileContent).append("\n\n");
            }

            rawGithubDataBuilder.append("COMMITS:\n").append(String.join("\n", commitMessages));

            String rawGithubData = rawGithubDataBuilder.toString();
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
                    .orElseThrow(() -> new BusinessException(ErrorCode.GITHUB_REPO_NOT_FOUND));

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
            throw new BusinessException(ErrorCode.GITHUB_ANALYSIS_PARSE_FAILED);
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
            throw new BusinessException(ErrorCode.GITHUB_PROMPT_LOAD_FAILED);
        }
    }

    private List<String> fetchTargetFiles(String owner, String repo, HttpHeaders baseHeaders) {
        List<String> collectedFiles = new ArrayList<>();

        // 1. 레포지토리의 기본 브랜치(보통 main 또는 master)의 트리 구조를 긁어온다.
        String treeApiUrl = String.format("https://api.github.com/repos/%s/%s/git/trees/HEAD?recursive=1", owner, repo);

        try {
            String treeResponse = restClient.get()
                    .uri(treeApiUrl)
                    .headers(httpHeaders -> httpHeaders.addAll(baseHeaders))
                    .retrieve()
                    .body(String.class);

            JsonNode rootNode = objectMapper.readTree(treeResponse);
            JsonNode treeNode = rootNode.path("tree");

            if (treeNode.isMissingNode() || !treeNode.isArray()) {
                return collectedFiles;
            }

            // 2. 전체 파일 경로를 순회하며 우리가 찾는 파일 이름(TARGET_FILES)이 포함된 경로만 필터링
            for (JsonNode node : treeNode) {
                String path = node.path("path").asText();
                String type = node.path("type").asText(); // "blob"은 파일, "tree"는 폴더

                if ("blob".equals(type)) {
                    // 파일명 추출 (경로의 마지막 부분)
                    String fileName = path.substring(path.lastIndexOf('/') + 1);

                    if (TARGET_FILES.contains(fileName)) {
                        // 3. 타겟 파일이 발견되면 해당 파일의 내용을 다운로드 (Raw 형태)
                        log.info("핵심 파일 발견: {}", path);
                        String fileContent = fetchFileContent(owner, repo, path, baseHeaders);
                        if (fileContent != null && !fileContent.isBlank()) {
                            // 프롬프트가 이 파일이 어떤 경로에 있던 파일인지 알 수 있도록 경로 정보를 달아줍니다.
                            collectedFiles.add(String.format("--- File Path: %s ---\n%s", path, fileContent));
                        }
                    }
                }
            }

        } catch (Exception e) {
            log.warn("Tree API 조회 또는 핵심 파일 수집 실패. 레포지토리: {}, 사유: {}", repo, e.getMessage());
        }

        return collectedFiles;
    }

    /**
     * 특정 경로의 파일 내용을 Raw Text 형태로 가져오는 메서드
     */
    private String fetchFileContent(String owner, String repo, String path, HttpHeaders baseHeaders) {
        String url = String.format("https://api.github.com/repos/%s/%s/contents/%s", owner, repo, path);

        try {
            return restClient.get()
                    .uri(url)
                    .headers(httpHeaders -> {
                        httpHeaders.addAll(baseHeaders);
                        // base64 인코딩된 json 대신 순수 텍스트(raw)로 바로 응답받기 위해 Accept 헤더 변경
                        httpHeaders.set("Accept", "application/vnd.github.v3.raw");
                    })
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            log.warn("파일 내용을 가져오는데 실패했습니다. 경로: {}", path);
            return null;
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

    @Async
    public void deleteGithubRepoEmbedding(Long userId, Long repoId) {
        // 1. URI에서 파라미터 제거
        String uri = fastAPI_URL + "/api/v1/embeddings/delete";

        // 2. FastAPI에서 요구한 JSON 스펙에 맞춰 Map 구조 생성
        Map<String, Object> requestBody = Map.of(
                "user_id", userId,
                "items", List.of(
                        Map.of(
                                "doc_type", "github",
                                "target_id", repoId
                        )
                )
        );

        try {
            log.info("[FastAPI 깃허브 임베딩 삭제 요청] URI: {}, userId: {}, repoId: {}", uri, userId, repoId);

            // 3. delete() 대신 method(HttpMethod.DELETE)를 사용하여 body 삽입
            restClient.method(HttpMethod.POST)
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        // 💡 FastAPI가 보내준 진짜 에러 메시지(JSON)를 읽어서 로그에 찍습니다.
                        String errorBody = new String(res.getBody().readAllBytes(), StandardCharsets.UTF_8);

                        log.error("[FastAPI 깃허브 임베딩 삭제 에러] Status: {}, URI: {}, ErrorBody: {}",
                                res.getStatusCode(), uri, errorBody); // ErrorBody 출력!

                        throw new BusinessException(ErrorCode.FASTAPI_SERVER_ERROR);
                    })
                    .toBodilessEntity();

            log.info("[FastAPI 깃허브 임베딩 삭제 성공] userId: {}, repoId: {}", userId, repoId);

        } catch (Exception e) {
            log.error("[FastAPI 깃허브 임베딩 삭제 시스템 에러] userId: {}, repoId: {}", userId, repoId, e);
        }
    }
}