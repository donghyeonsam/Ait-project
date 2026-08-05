package com.aitserver.user.service;


import com.aitserver.github.entity.GithubApp;
import com.aitserver.github.entity.GithubRepo;
import com.aitserver.github.repository.GithubAppRepository;
import com.aitserver.github.repository.GithubRepoRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.global.file.FileCategory;
import com.aitserver.global.file.FileStorageService;
import com.aitserver.user.entity.User;
import com.aitserver.user.entity.UserSkill;
import com.aitserver.user.dto.MyPageGithubRepoUpdateRequest;
import com.aitserver.user.dto.MyPageUpdateRequest;
import com.aitserver.user.dto.MyPageGithubRepoResponse;
import com.aitserver.user.dto.MyPageResponse;
import com.aitserver.user.repository.UserRepository;
import com.aitserver.user.repository.UserSkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MyPageService {

    private static final String IMAGE_URL_PREFIX = "https://i15d202.p.ssafy.io/uploads/";

    private final UserRepository userRepository;
    private final UserSkillRepository userSkillRepository;
    private final GithubAppRepository githubAppRepository;
    private final GithubRepoRepository githubRepoRepository;
    private final FileStorageService fileStorageService;

    /**
     * 내 정보 조회
     */
    @Transactional(readOnly = true)
    public MyPageResponse getMyPage(Long userId) {

        User user = findUser(userId);

        List<UserSkill> userSkills =
                userSkillRepository.findAllByUserIdOrderByIdAsc(userId);

        List<GithubApp> githubApps = githubAppRepository.findByUserId(userId);

        return createMyPageResponse(user, userSkills, githubApps);
    }

    /**
     * 내 정보 통합 수정
     */
    @Transactional
    public MyPageResponse updateMyPage(
            Long userId,
            MyPageUpdateRequest request,
            MultipartFile profileImage
    ) {
        User user = findUser(userId);

        validateNickname(
                userId,
                request.getNickname()
        );

        // 닉네임 및 관심 직무 수정
        user.updateMyPage(
                request.getName().trim(),
                request.getNickname().trim(),
                normalizeNullableValue(
                        request.getFirstJobInterest()
                ),
                normalizeNullableValue(
                        request.getSecondJobInterest()
                )
        );

        // 프로필 이미지가 새로 들어온 경우에만 교체
        updateProfileImage(
                user,
                profileImage
        );

        // 기술 스택 전체 교체
        replaceSkills(
                user,
                request.getSkills()
        );

        // 깃허브 레포지토리 별칭 수정
        updateGithubRepoNicknames(
                userId,
                request.getGithubRepositories()
        );

        List<UserSkill> updatedSkills =
                userSkillRepository.findAllByUserIdOrderByIdAsc(userId);

        List<GithubApp> githubApps = githubAppRepository.findByUserId(userId);

        return createMyPageResponse(user, updatedSkills, githubApps);
    }

    @Transactional(readOnly = true)
    public boolean isNicknameAvailable(String nickname) {
        return !userRepository.existsByNickname(
                nickname
        );
    }


    private User findUser(Long userId) {
        return userRepository
                .findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() ->
                        new BusinessException(
                                ErrorCode.USER_NOT_FOUND
                        )
                );
    }

    private void validateNickname(
            Long userId,
            String nickname
    ) {
        String trimmedNickname = nickname.trim();

        boolean duplicated =
                userRepository
                        .existsByNicknameAndIdNotAndDeletedAtIsNull(
                                trimmedNickname,
                                userId
                        );

        if (duplicated) {
            throw new BusinessException(
                    ErrorCode.DUPLICATE_NICKNAME
            );
        }
    }

    private void updateProfileImage(
            User user,
            MultipartFile profileImage
    ) {
        // 이미지가 전달되지 않았다면 기존 프로필 이미지를 유지
        if (profileImage == null || profileImage.isEmpty()) {
            return;
        }

        String oldProfileImage =
                user.getProfileImage();

        // profiles 하위 폴더에 새 이미지 저장
        String newProfileImage =
                fileStorageService.storeFile(
                        profileImage,
                        FileCategory.PROFILE
                );

        user.updateProfileImage(newProfileImage);

        // 기존 이미지가 있다면 실제 파일 삭제
        if (oldProfileImage != null
                && !oldProfileImage.isBlank()) {

            fileStorageService.deleteFile(
                    oldProfileImage
            );
        }
    }

    private void replaceSkills(
            User user,
            List<String> requestedSkills
    ) {
        LinkedHashSet<String> uniqueSkills =
                requestedSkills.stream()
                        .map(String::trim)
                        .filter(skill -> !skill.isBlank())
                        .collect(Collectors.toCollection(
                                LinkedHashSet::new
                        ));

        // 기존 기술 스택 삭제
        userSkillRepository.deleteAllByUserId(
                user.getId()
        );

        // 중요: 새 기술을 저장하기 전에 DELETE SQL을 먼저 실행
        userSkillRepository.flush();

        List<UserSkill> newSkills =
                uniqueSkills.stream()
                        .map(skill ->
                                UserSkill.builder()
                                        .userId(user.getId())
                                        .skill(skill)
                                        .build()
                        )
                        .toList();

        userSkillRepository.saveAll(newSkills);
    }

    private void updateGithubRepoNicknames(
            Long userId,
            List<MyPageGithubRepoUpdateRequest> requests
    ) {
        if (requests == null || requests.isEmpty()) {
            return;
        }

        List<GithubApp> githubApps = githubAppRepository.findByUserId(userId);
        if (githubApps.isEmpty()) {
            throw new BusinessException(ErrorCode.GITHUB_APP_NOT_FOUND);
        }

        List<Long> appIds = githubApps.stream().map(GithubApp::getId).toList();

        // 같은 repoId가 요청에 두 번 들어오는 것을 방지
        Set<Long> requestedRepoIds =
                requests.stream()
                        .map(
                                MyPageGithubRepoUpdateRequest
                                        ::getGithubRepoId
                        )
                        .collect(Collectors.toSet());

        if (requestedRepoIds.size() != requests.size()) {
            throw new BusinessException(
                    ErrorCode.INVALID_GITHUB_REPOSITORY
            );
        }

        // 현재 사용자의 GithubApp에 속한 레포만 조회
        List<GithubRepo> githubRepos = githubRepoRepository.findAllByIdInAndGithubApp_IdIn(requestedRepoIds, appIds);

        // 요청한 ID 중 본인 소유가 아닌 레포가 포함된 경우
        if (githubRepos.size()
                != requestedRepoIds.size()) {

            throw new BusinessException(
                    ErrorCode.GITHUB_REPOSITORY_NOT_FOUND
            );
        }

        Map<Long, MyPageGithubRepoUpdateRequest> requestMap =
                requests.stream()
                        .collect(Collectors.toMap(
                                MyPageGithubRepoUpdateRequest
                                        ::getGithubRepoId,
                                Function.identity()
                        ));

        for (GithubRepo githubRepo : githubRepos) {

            MyPageGithubRepoUpdateRequest updateRequest =
                    requestMap.get(
                            githubRepo.getId()
                    );

            githubRepo.updateNickname(
                    updateRequest
                            .getRepoNickname()
                            .trim()
            );
        }
    }

    private MyPageResponse createMyPageResponse(
            User user,
            List<UserSkill> userSkills,
            List<GithubApp> githubApps
    ) {
        List<String> skills =
                userSkills.stream()
                        .map(UserSkill::getSkill)
                        .toList();

        String githubUsername = null;
        String githubUrl = null;

        List<MyPageGithubRepoResponse> repositories =
                Collections.emptyList();

        if (githubApps != null && !githubApps.isEmpty()) {
            // 대표 프로필 이름은 첫 번째 연동된 계정으로 설정
            GithubApp mainApp = githubApps.get(0);
            githubUsername = mainApp.getGithubUsername();
            githubUrl = createGithubUserUrl(githubUsername);

            List<Long> appIds = githubApps.stream().map(GithubApp::getId).toList();

            // 유저의 모든 조직 레포지토리 가져오기
            List<GithubRepo> githubRepos = githubRepoRepository.findAllByGithubApp_IdInOrderByIdAsc(appIds);

            repositories = githubRepos.stream()
                    .map(repo -> MyPageGithubRepoResponse.builder()
                            .githubRepoId(repo.getId())
                            .repoNickname(repo.getRepoNickname())
                            // 각 레포지토리가 속한 조직(App)의 이름으로 URL 생성
                            .repoUrl(createGithubRepoUrl(repo.getGithubApp().getGithubUsername(), repo.getRepoName()))
                            .build()
                    )
                    .toList();
        }

        return MyPageResponse.builder()
                .userId(user.getId())
                .name(user.getName())
                .nickname(user.getNickname())
                .email(user.getEmail())
                .firstJobInterest(
                        user.getFirstJobInterest()
                )
                .secondJobInterest(
                        user.getSecondJobInterest()
                )
                .profileImageUrl(
                        createProfileImageUrl(
                                user.getProfileImage()
                        )
                )
                .skills(skills)
                .githubUsername(githubUsername)
                .githubUrl(githubUrl)
                .githubRepositories(repositories)
                .build();
    }

    private String createProfileImageUrl(
            String storedPath
    ) {
        if (storedPath == null || storedPath.isBlank()) {
            return null;
        }

        return IMAGE_URL_PREFIX + storedPath;
    }

    private String createGithubUserUrl(
            String githubUsername
    ) {
        return "https://github.com/"
                + githubUsername;
    }

    private String createGithubRepoUrl(
            String githubUsername,
            String repoName
    ) {
        return "https://github.com/"
                + githubUsername
                + "/"
                + repoName;
    }

    private String normalizeNullableValue(
            String value
    ) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}