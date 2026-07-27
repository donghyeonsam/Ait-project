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
import org.springframework.web.multipart.MultipartFile;

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

        FastQuestionGenerateResponse fastResponse = sendToFastApi(
                "/api/v1/interviews/questions",
                fastRequest,
                FastQuestionGenerateResponse.class
        );
        fastResponse.setAiInterviewId(aiInterview.getId());     // aiInterviewId 삽입
        fastResponse.setInterviewType(request.interviewType()); // interviewType 삽입

        return AiInterviewQuestionResponse.of(userId, fastResponse);
    }

    @Override
    @Transactional
    public FollowUpQuestionResponse answerCheckForfollowUp(Long userId, Long aiInterviewId, FollowUpQuestionRequest questionRequest, MultipartFile audioFile) {
        log.info("[AiInterviewServiceImpl, FollowUpQuestion] 면접 질문: {}, 사용자 답변: {}",
                questionRequest.getQuestion().getQuestion(), questionRequest.getAnswer());

        log.info("[AiInterviewServiceImpl, FollowUpQuestion] 수신된 음성 파일명: {}, 타입: {}, 크기: {} bytes",
                audioFile.getOriginalFilename(), audioFile.getContentType(), audioFile.getSize());

        // 질문의 order 번호를 확인해서 1번일 때만 진행 상황을 ready에서 doing으로 변경
        if(questionRequest.getQuestion().getOrder() == 1) {
            aiInterviewsRepository.updateStatus(userId, aiInterviewId);
        }

        // interviewType을 바로 소문자로 변경
        if (questionRequest.getInterviewType() != null) {
            questionRequest.setInterviewType(questionRequest.getInterviewType().toLowerCase());
        }
        // 1. 사용자의 답변 바로 FastAPI로 전달
        FastFollowUpRequest fastFollowUpRequest = new FastFollowUpRequest();
        fastFollowUpRequest.setUserId(userId); // userId 붙이기
        fastFollowUpRequest.setAiInterviewId(aiInterviewId); // aiInterviewId 붙이기
        fastFollowUpRequest.setRequest(questionRequest); // 프론트에서 전달받은 내용 붙이기

        FollowUpQuestionResponse followUpResponse = sendToFastApi(
                "/api/v1/interviews/followup",
                fastFollowUpRequest,
                FollowUpQuestionResponse.class
        );

        // 2. DB 저장과 AI 분석을 위해 다른 서비스로 내용 전송(비동기)

        // 3. 사용자의 답변 음성 파일 원본 FastAPI 전달(목소리 분석을 통한 채점을 위해)

        return followUpResponse;
    }

    // FastAPI로 호출 보내고 결과값을 리턴받는 공통 메서드
    private <T, R> R sendToFastApi(String uri, T requestBody, Class<R> responseType) {
        try {
            log.info("[FastAPI 통신 요청] URI: {}, Payload: {}", uri, requestBody);

            R response = fastApiRestClient.post()
                    .uri(uri)
                    .body(requestBody)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        log.error("[FastAPI 통신 에러] Status: {}, URI: {}", res.getStatusCode(), uri);
                        throw new BusinessException(ErrorCode.FASTAPI_SERVER_ERROR);
                    })
                    .body(responseType);

            log.info("[FastAPI 통신 응답 성공] URI: {}", uri);
            return response;

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("[FastAPI 통신 시스템 에러] URI: " + uri, e);
            throw new BusinessException(ErrorCode.FASTAPI_SERVER_ERROR);
        }
    }
}
