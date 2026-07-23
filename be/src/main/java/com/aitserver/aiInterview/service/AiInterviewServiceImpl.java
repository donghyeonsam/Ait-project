package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.dto.*;
import com.aitserver.aiInterview.entity.AiInterview;
import com.aitserver.aiInterview.repository.AiInterviewCoverLetterRepository;
import com.aitserver.aiInterview.repository.AiInterviewGithubRepoRepository;
import com.aitserver.aiInterview.repository.AiInterviewsRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.user.repository.UserSkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiInterviewServiceImpl implements AiInterviewService {

    private final AiInterviewCoverLetterRepository coverLetterRepository;
    private final AiInterviewGithubRepoRepository githubRepoRepository;
    private final AiInterviewsRepository aiInterviewsRepository;
    private final UserSkillRepository userSkillRepository;
    private final RestClient fastApiRestClient;

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
    @Transactional
    public AiInterviewQuestionResponse insertAndGenerate(Long userId, AiInterviewQuestionRequest request) {
        // 디비에 값들 저장
        log.info("[AiInterview, insertAndGenerate] 사용자 AI 질문 생성 메서드 진입 userId: {}", userId);

        AiInterview aiInterview = AiInterview.builder()
                .userId(userId)
                .interviewType(request.interviewType())
                .difficulty(request.difficulty())
                .aiAttitudeStyle(request.aiAttitudeStyle())
                .status("ready") // status는 ready, doing, done으로 관리
                .build(); // ai_interviews 테이블에 넣을 기본 정보 빌드

        AiInterview saveResult = aiInterviewsRepository.save(aiInterview); // DB에 빌드한 내용 저장
        // 디비에 사용자 skills 가져오기
        List<String> skills = userSkillRepository.findSkillsByUserId(userId);
        log.info("[AiInterview, insertAndGenerate] 사용자 스킬 조회 완료, userId: {}, skills: {}", userId, skills.toString());

        // FastAPI로 전달하기 위한 정보 빌드하기
        FastQuestionGenerateRequest fastRequest = FastQuestionGenerateRequest.builder()
                .userId(userId)
                .aiInterviewId(saveResult.getId())
                .position(request.jobRole())
                .career(request.experienceLevel())
                .skills(skills)
                .resumeId(request.resumeId())
                .coverLetterId(request.coverLetterId())
                .githubRepoId(request.githubRepoId())
                .interviewType(request.interviewType())
                .csCategories(request.csCategories() != null ? request.csCategories() : List.of()) // 값이 없으면 빈 리스트로 전달
                .difficulty(request.difficulty())
                .aiAttitudeStyle(request.aiAttitudeStyle())
                .build();

        log.info("[AiInterview, insertAndGenerate] FastAPI 질문 생성 요청 전송: {}", fastRequest);
        // fastAPI로 정보들 전달
        try {
            FastQuestionGenerateResponse fastResponse = fastApiRestClient.post() // post 요청
                    .uri("/api/v1/interviews/questions")
                    .body(fastRequest)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        // 4xx, 5xx 에러 처리
                        log.error("[AiInterviewServiceImpl, FastAPI 에러] HTTP Status: {}", res.getStatusCode());
                        throw new BusinessException(ErrorCode.FASTAPI_SERVER_ERROR);
                    })
                    .body(FastQuestionGenerateResponse.class);

            log.info("[AiInterviewServiceImpl, FastAPI] 질문 생성 응답 성공: {}", fastResponse);

            // 생성된 질문 리스트 프론트로 전달
            return AiInterviewQuestionResponse.of(userId, fastResponse);
        } catch (BusinessException e) {
            throw new BusinessException(ErrorCode.FASTAPI_SERVER_ERROR);
        } catch (Exception e) {
            log.error("[AiInterviewServiceImpl, FastAPI] 통신 에러 발생", e);
            throw new RuntimeException(e);
        }
    }
}
