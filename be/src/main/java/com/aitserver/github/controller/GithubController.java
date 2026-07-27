package com.aitserver.github.controller;

import com.aitserver.github.dto.GithubRepoNicknameUpdateRequestDto;
import com.aitserver.github.dto.GithubRepoResponseDto;
import com.aitserver.github.service.GithubDataService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.coyote.Response;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/github")
public class GithubController {

    private final GithubDataService githubDataService;

    /**
     * 깃허브 Callback 수신 및 연동 정보 DB 동기화
     */
    @GetMapping("/callback")
    public ResponseEntity<ApiResponse<Void>> githubCallback(
            @RequestParam("installation_id") String installationId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {
        log.info("깃허브 콜백 도착 - Installation ID: {}", installationId);

        githubDataService.syncGithubRepositories(userId, installationId);

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
    public ResponseEntity<ApiResponse<List<GithubRepoResponseDto>>> getMyRepos(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        List<GithubRepoResponseDto> repoList = githubDataService.getSavedRepos(userId);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "레포지토리 목록 조회 성공.",
                repoList,
                request
        ));
    }

    /**
     * 사용자에게 보이는 깃허브 닉네임 수정 API
     */
    @PatchMapping("/repos/{repoId}")
    public ResponseEntity<ApiResponse<Void>> updateRepoNickname(
            @PathVariable("repoId") Long repoId,
            @Valid @RequestBody GithubRepoNicknameUpdateRequestDto requestDto,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        githubDataService.updateRepoNickname(userId, repoId, requestDto.getRepoNickname());

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "레포지토리 닉네임이 성공적으로 수정되었습니다.",
                request
        ));
    }

    /**
     * 레포지토리 연동 삭제 API
     */
    @DeleteMapping("/repos/{repoId}")
    public ResponseEntity<ApiResponse<Void>> deleteRepo(
            @PathVariable("repoId") Long repoId,
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request) {

        githubDataService.deleteRepo(userId, repoId);

        return ResponseEntity.ok(ApiResponse.success(
                HttpStatus.OK,
                "레포지토리가 삭제되었습니다.",
                request
        ));
    }

}
