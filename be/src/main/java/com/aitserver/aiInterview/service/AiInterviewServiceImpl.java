package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.dto.*;
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


    @Override
    public AiInterviewQuestionResponse insertAndGenerate(Long userId, AiInterviewQuestionRequest aiInterviewQuestionRequest) {
        // 디비에 값들 저장
        // 디비에 사용자 skills 가져오기
        // fastAPI로 정보들 전달
        // 생성된 질문 리스트 프론트로 전달


        return null;
    }
}
