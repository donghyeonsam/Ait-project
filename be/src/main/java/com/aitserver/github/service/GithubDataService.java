package com.aitserver.github.service;

import com.aitserver.github.entity.GithubApp;
import com.aitserver.github.entity.GithubRepo;
import com.aitserver.github.repository.GithubAppRepository;
import com.aitserver.github.repository.GithubRepoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GithubDataService {

    private final GithubAppRepository githubAppRepository;
    private final GithubRepoRepository githubRepoRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 1. 깃허브 앱 연동 정보 저장 (Callback 시 호출)
     */
    @Transactional
    public GithubApp saveGithubAppInstallation(Long userId, String installationId, String githubUsername) {
        // 이미 연동한 이력이 있다면 업데이트, 없다면 새로 생성
        GithubApp githubApp = githubAppRepository.findByUserId(userId)
                .orElse(new GithubApp());

        githubApp.setUserId(userId);
        githubApp.setInstallationId(installationId);
        githubApp.setGithubUsername(githubUsername);

        return githubAppRepository.save(githubApp);
    }

    /**
     * 2. 깃허브 레포지토리 저장 (분석 내용 null)
     */
    @Transactional
    public void saveGithubRepo(Long githubAppId, Long repoId, String repoName, boolean isPrivate) {
        // 중복 저장 방지
        if (githubRepoRepository.existsByGithubAppIdAndRepoId(githubAppId, repoId)) {
            return;
        }

        GithubApp githubApp = githubAppRepository.findById(githubAppId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 연동"));

        GithubRepo repo = new GithubRepo();
        repo.setGithubApp(githubApp);
        repo.setRepoId(repoId);
        repo.setRepoName(repoName);
        repo.setRepoNickname(repoName);
        repo.setAnalysisContent(null); //TODO
        repo.setIsPrivate(isPrivate);

        githubRepoRepository.save(repo);
    }

    /**
     * 3. 저장된 레포지토리 목록 불러오기
     */
    @Transactional(readOnly = true)
    public List<GithubRepo> getSavedRepos(Long userId) {
        GithubApp githubApp = githubAppRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("깃허브 연동 없습니다."));

        return githubRepoRepository.findByGithubAppId(githubApp.getId());
    }

    /**
     * 특정 레포지토리에서 '내가 작성한' 커밋 메시지 목록 가져오기
     */
    public List<String> getMyCommitMessages(String accessToken, String owner, String repo, String myGithubId) {

        // 1. author 파라미터를 붙여서 내 커밋만 필터링
        String url = String.format("https://api.github.com/repos/%s/%s/commits?author=%s", owner, repo, myGithubId);

        // 2. 헤더에 Access Token 세팅
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + accessToken);
        headers.set("Accept", "application/vnd.github.v3+json");

        HttpEntity<String> entity = new HttpEntity<>(headers);

        // 3. API 호출
        ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.GET, entity, JsonNode.class);
        JsonNode commitsNode = response.getBody();

        // 4. 커밋 메시지만 쏙쏙 뽑아서 리스트로 만들기
        List<String> commitMessages = new ArrayList<>();
        if (commitsNode != null && commitsNode.isArray()) {
            for (JsonNode commitObj : commitsNode) {
                // JSON 구조: commit -> message
                String message = commitObj.get("commit").get("message").asText();
                commitMessages.add(message);

                // MVP니까 너무 많으면 토큰 낭비! 최신 15개 정도만 끊어주는 것도 좋습니다.
                if (commitMessages.size() >= 15) break;
            }
        }

        return commitMessages;
    }
}