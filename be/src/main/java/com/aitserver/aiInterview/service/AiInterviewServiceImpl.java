package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.dto.AiInterviewPreparationResponse;
import com.aitserver.aiInterview.dto.CoverLetterInfoForAiInterview;
import com.aitserver.aiInterview.dto.GithubRepoInfoForAiInterview;
import com.aitserver.aiInterview.repository.AiInterviewCoverLetterRepository;
import com.aitserver.aiInterview.repository.AiInterviewGithubRepoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiInterviewServiceImpl implements AiInterviewService{

    private final AiInterviewCoverLetterRepository coverLetterRepository;
    private final AiInterviewGithubRepoRepository githubRepoRepository;

    @Override
    @Transactional(readOnly = true)
    public AiInterviewPreparationResponse getPreparationInfo(Long userId) {
        log.info("[AiInterview, getPreparationInfo] 사용자의 자기소개서, 깃허브 레포 리스트 조회, userId: {}", userId);
        // 사용자의 자기소개서 리스트 조회
        List<CoverLetterInfoForAiInterview> coverLetters = coverLetterRepository.findCoverLetterInfoByUserId(userId);
        // 사용자의 깃허브 레포 리스트 조회
        List<GithubRepoInfoForAiInterview> githubRepos = githubRepoRepository.findGithubRepoInfoByUserId(userId);

        return new AiInterviewPreparationResponse(userId, coverLetters, githubRepos);
    }
}
