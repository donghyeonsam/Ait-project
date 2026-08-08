package com.aitserver.aiInterview.service;

import com.aitserver.aiInterview.client.FastApiClient;
import com.aitserver.aiInterview.dto.*;
import com.aitserver.aiInterview.entity.AiComprehensiveReport;
import com.aitserver.aiInterview.entity.AiInterview;
import com.aitserver.aiInterview.entity.AiInterviewQuestion;
import com.aitserver.aiInterview.repository.*;
import com.aitserver.aiInterview.requestDto.AiInterviewQuestionRequest;
import com.aitserver.aiInterview.requestDto.FastFollowUpRequest;
import com.aitserver.aiInterview.requestDto.FastQuestionGenerateRequest;
import com.aitserver.aiInterview.requestDto.FollowUpQuestionRequest;
import com.aitserver.aiInterview.responseDto.*;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.user.repository.UserSkillRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
    private final FastApiClient fastApiClient;
    private final AiInterviewAsyncService asyncService;
    private final AiComprehensiveReportRepository aiComprehensiveReportRepository;
    private final AiInterviewQuestionRepository aiInterviewQuestionRepository;

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

        FastQuestionGenerateResponse fastResponse = fastApiClient.sendToFastApi(
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
    public FollowUpQuestionResponse answerCheckForFollowUp(Long userId, Long aiInterviewId, FollowUpQuestionRequest questionRequest, MultipartFile audioFile) {
        log.info("[AiInterviewServiceImpl, FollowUpQuestion] 면접 질문: {}, 사용자 답변: {}",
                questionRequest.getQuestion().getQuestion(), questionRequest.getAnswer());

        log.info("[AiInterviewServiceImpl, FollowUpQuestion] 수신된 음성 파일명: {}, 타입: {}, 크기: {} bytes",
                audioFile.getOriginalFilename(), audioFile.getContentType(), audioFile.getSize());

        // 질문의 order 번호를 확인해서 1번일 때만 진행 상황을 ready에서 doing으로 변경
        if(questionRequest.getQuestion().getOrder() == 1) {
            aiInterviewsRepository.updateStatus(userId, aiInterviewId, "doing");
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

        FollowUpQuestionResponse followUpResponse = fastApiClient.sendToFastApi( // -> 꼬리 질문을 생성하기 위해 보내는 요청
                "/api/v1/interviews/followup",
                fastFollowUpRequest,
                FollowUpQuestionResponse.class
        );

        // 2. DB 저장과 AI 분석을 위해 다른 서비스로 내용 전송(비동기)
        asyncService.insertAndAnalysisAsync(userId, aiInterviewId, questionRequest);

        // 3. 사용자의 답변 음성 파일 원본 FastAPI 전달(목소리 분석을 통한 채점을 위해)
        try {
            byte[] audioBytes = audioFile.getBytes();
            String filename = audioFile.getOriginalFilename();
            String contentType = audioFile.getContentType();

            // 비동기 메서드로 바이트 데이터와 메타데이터 전송
            asyncService.sendAudioToFastApiAsync(userId, aiInterviewId, audioBytes, filename, contentType);

        } catch (Exception e) { // IOException 처리
            log.error("[AiInterviewServiceImpl] 음성 파일 바이트 변환 중 에러 발생, userId: {}, aiInterviewId: {}", userId, aiInterviewId, e);
        }

        return followUpResponse;
    }

    @Transactional(readOnly = true)
    @Override
    @Cacheable(
            value = "reportList",
            key = "#userId",
            unless = "#result == null || #result.isEmpty()"
    )
    public List<ReportListResponse> getList(Long userId) {
        log.info("[AiInterviewServiceImpl] 사용자 AI 면접 결과 리스트 조회 userId: {}", userId);

        List<ReportListResponse> response = aiInterviewsRepository.findReportListByUserId(userId);

        log.info("[AiInterviewServiceImpl] AI 면접 결과 {}건 조회 성공", response.size());
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public AiInterviewDetailResponse getInterviewDetail(Long userId, Long aiInterviewId) {
        log.info("[상세 조회] userId: {}, aiInterviewId: {}", userId, aiInterviewId);

        // 1. 면접 정보 조회 (타인의 면접 조회 방지: findByIdAndUserId)
        AiInterview interview = aiInterviewsRepository.findByIdAndUserId(aiInterviewId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INTERVIEW_NOT_FOUND));

        // 2. 종합 평가 리포트 조회
        AiComprehensiveReport report = aiComprehensiveReportRepository.findByAiInterviewId(aiInterviewId)
                .orElseThrow(() -> new BusinessException(ErrorCode.REPORT_NOT_FOUND));

        // 3. 질문/답변 목록 조회
        List<AiInterviewQuestion> questionEntities = aiInterviewQuestionRepository.findAllByAiInterviewId(aiInterviewId);

        // 4. 질문 DTO 변환
        List<AiInterviewDetailResponse.QuestionDetailDto> questionDtos = questionEntities.stream()
                .map(q -> AiInterviewDetailResponse.QuestionDetailDto.builder()
                        .questionId(q.getId())
                        .question(q.getQuestion())
                        .userAnswer(q.getUserAnswer())
                        .aiAnswer(q.getAiAnswer())
                        .feedback(q.getFeedback())
                        .build())
                .toList();

        // 5. 최종 응답 DTO 조립
        return AiInterviewDetailResponse.builder()
                .aiInterviewId(interview.getId())
                .interviewType(interview.getInterviewType())
                .difficulty(interview.getDifficulty())
                .createdAt(interview.getCreatedAt()) // ai_interviews의 created_at 사용
                .endedAt(interview.getEndedAt())
                .content(report.getContent())
                .eyeContactScore(report.getEyeContactScore())
                .faceScore(report.getFaceScore())
                .voiceScore(report.getVoiceScore())
                .qnaScore(report.getQnaScore())
                .sentenceScore(report.getSentenceScore())
                .questions(questionDtos)
                .build();
    }
}
