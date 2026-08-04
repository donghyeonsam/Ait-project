package com.aitserver.github.service;

import com.aitserver.github.dto.GithubRepoResponseDto;
import com.aitserver.github.entity.GithubApp;
import com.aitserver.github.entity.GithubRepo;
import com.aitserver.github.repository.GithubAppRepository;
import com.aitserver.github.repository.GithubRepoRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.View;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class GithubDataService {

    private final GithubAppRepository githubAppRepository;
    private final GithubRepoRepository githubRepoRepository;
    private final GithubTokenService githubTokenService;
    private final GithubAnalysisService githubAnalysisService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();
    private final View error;

    /**
     * 깃허브 레포지토리 동기화 (토큰 발급 -> API 조회 -> DB 저장 한방에 처리)
     */
    @Transactional
    public void syncGithubRepositories(Long userId, String installationId) {
        // 1. 임시 토큰 발급
        String accessToken;
        try {
            accessToken = githubTokenService.getInstallationAccessToken(installationId);
        } catch (Exception e) {
            log.error("깃허브 Access Token 발급 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.GITHUB_TOKEN_ISSUE_FAILED);
        }

        // 2. 깃허브 API로 레포지토리 목록 조회
        String repoUrl = "https://api.github.com/installation/repositories";
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.set("Accept", "application/vnd.github.v3+json");

        HttpEntity<String> entity = new HttpEntity<>(headers);
        try {
            ResponseEntity<String> response = restTemplate.exchange(repoUrl, HttpMethod.GET, entity, String.class);
            JsonNode rootNode = objectMapper.readTree(response.getBody());
            JsonNode reposNode = rootNode.get("repositories");

            if (reposNode != null && reposNode.size() > 0) {
                String ownerId = reposNode.get(0).get("owner").get("login").asText();

                GithubApp githubApp = githubAppRepository.findByInstallationId(installationId)
                        .orElseGet(() -> {
                            GithubApp newApp = GithubApp.builder()
                                    .userId(userId)
                                    .installationId(installationId)
                                    .githubUsername(ownerId)
                                    .build();
                            return githubAppRepository.save(newApp);
                        });

                Set<Long> latestApiRepoIds = new HashSet<>();
                for (JsonNode repoNode : reposNode) {
                    latestApiRepoIds.add(repoNode.get("id").asLong());
                }

                List<GithubRepo> existingRepos = githubRepoRepository.findByGithubAppId(githubApp.getId());

                for (GithubRepo dbRepo : existingRepos) {
                    if (!latestApiRepoIds.contains(dbRepo.getRepoId())) {
                        githubRepoRepository.delete(dbRepo);
                        log.info("레포지토리 연동 해제 감지 (DB 삭제 완료): {}", dbRepo.getRepoName());
                    }
                }

                for (JsonNode repoNode : reposNode) {
                    Long repoId = repoNode.get("id").asLong();
                    String repoName = repoNode.get("name").asText();
                    boolean isPrivate = repoNode.get("private").asBoolean();

                    if (!githubRepoRepository.existsByGithubAppIdAndRepoId(githubApp.getId(), repoId)) {
                        GithubRepo repo = GithubRepo.builder()
                                .githubApp(githubApp)
                                .repoId(repoId)
                                .repoName(repoName)
                                .repoNickname(repoName)
                                .isPrivate(isPrivate)
                                .build();

                        githubRepoRepository.save(repo);
                        log.info("레포지토리 저장 완료: {}", repoName);

                        githubAnalysisService.requestAnalysisToFastApi(
                                userId,
                                repo.getId(),
                                installationId,
                                ownerId,
                                repoName
                        );
                    }
                }
            }
        } catch (Exception e) {
            log.error("깃허브 레포지토리 목록 조회/파싱 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.GITHUB_REPO_SYNC_FAILED);
        }
    }

    /**
     * 저장된 레포지토리 목록 불러오기
     */
    @Transactional(readOnly = true)
    public List<GithubRepoResponseDto> getSavedRepos(Long userId) {
        List<GithubApp> apps = githubAppRepository.findByUserId(userId);

        if (apps.isEmpty()) {
            throw new BusinessException(ErrorCode.GITHUB_APP_NOT_FOUND);
        }

        // 조직들의 ID만 추출
        List<Long> appIds = apps.stream().map(GithubApp::getId).toList();

        List<GithubRepo> repos = githubRepoRepository.findByGithubAppIdIn(appIds);

        // Entity 리스트를 DTO 리스트로 변환하여 반환
        return repos.stream()
                .map(GithubRepoResponseDto::from)
                .toList();
    }

    /**
     * 레포지토리 닉네임 수정
     */
    @Transactional
    public void updateRepoNickname(Long userId, Long repoId, String newNickname) {
        GithubRepo repo = githubRepoRepository.findByIdAndGithubAppUserId(repoId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GITHUB_REPO_NOT_FOUND));

        repo.updateNickname(newNickname);
    }

    /**
     * 레포지토리 삭제
     */
    public void deleteRepo(Long userId, Long repoId) {
        GithubRepo repo = githubRepoRepository.findByIdAndGithubAppUserId(repoId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GITHUB_REPO_NOT_FOUND));

        githubRepoRepository.delete(repo);
    }
}
