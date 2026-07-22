package com.aitserver.resume.service;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.resume.analysis.event.ResumeAnalysisRequestedEvent;
import com.aitserver.resume.analysis.service.ResumeChangeDetector;
import com.aitserver.resume.dto.*;
import com.aitserver.resume.entity.Resume;
import com.aitserver.resume.entity.ResumeCareer;
import com.aitserver.resume.entity.ResumeProject;
import com.aitserver.resume.entity.ResumeTraining;
import com.aitserver.resume.repository.ResumeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
//@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ResumeServiceImpl implements ResumeService{

    private final ResumeRepository resumeRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final ResumeChangeDetector resumeChangeDetector;

    // 내 이력서 조회
    @Override
    public ResumeResponse getMyResume(Long userId) {
        Resume resume = resumeRepository.findByUser_Id(userId)
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.RESUME_NOT_FOUND)
                );

        return ResumeResponse.from(resume);
    }

    // 이력서 아이디 기반 조회
    @Override
    public ResumeResponse getResume(Long resumeId) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.RESUME_NOT_FOUND)
                );
        return ResumeResponse.from(resume);
    }

    // 이력서 업데이트
    @Transactional
    public ResumeResponse updateResume(
            Long resumeId,
            Long loginUserId,
            ResumeUpdateRequest request
    ) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.RESUME_NOT_FOUND)
                );

        validateOwner(resume, loginUserId);

        validateRequest(request);

        // 분석결과 변경이 필요한지 검사
        boolean significantChange = resumeChangeDetector.isSignificantChange(resume, request);

        // 기존 분석결과가 비어있거나 변경이 필요하다면 true
        boolean analysisRequired = resume.getAnalysisContent() == null || resume.getAnalysisContent().isBlank() || significantChange;

        // 변경이 필요하다면 기존 분석결과 삭제
        if (analysisRequired) {
            resume.clearAnalysisContent();
        }

        // 기존 학력, 프로젝트, 경력 모두 제거
        resume.clearResumeDetails();

        // 요청받은 학력 전체 등록
        for (ResumeTrainingRequest trainingRequest : request.trainings()) {
            ResumeTraining training = new ResumeTraining(
                    trainingRequest.startDate(),
                    trainingRequest.endDate(),
                    trainingRequest.organization(),
                    trainingRequest.course(),
                    trainingRequest.description()
            );

            resume.addTraining(training);
        }

        // 요청받은 프로젝트 전체 등록
        for (ResumeProjectRequest projectRequest : request.projects()) {
            ResumeProject project = new ResumeProject(
                    projectRequest.projectName(),
                    projectRequest.techStacks(),
                    projectRequest.role(),
                    projectRequest.description()
            );

            resume.addProject(project);
        }

        // 요청받은 경력 전체 등록
        for (ResumeCareerRequest careerRequest : request.careers()) {
            ResumeCareer career = new ResumeCareer(
                    careerRequest.startDate(),
                    careerRequest.endDate(),
                    careerRequest.companyName(),
                    careerRequest.role(),
                    careerRequest.description()
            );

            resume.addCareer(career);
        }


        resumeRepository.flush();

        // 분석이 필요하다면 이벤트 발생
        if (analysisRequired) {
            eventPublisher.publishEvent(
                    new ResumeAnalysisRequestedEvent(
                            resume.getId()
                    )
            );
        }

        return ResumeResponse.from(resume);
    }

    // 사용자 검증용 메서드
    // 수정을 요청하는 사용자가 resume 주인인가?
    private void validateOwner(Resume resume, Long loginUserId) {
        if (!resume.getUser().getId().equals(loginUserId)) {
            throw new BusinessException(
                    ErrorCode.RESUME_ACCESS_DENIED
            );
        }
    }

    // 날짜 검사용 순회 코드
    private void validateRequest(ResumeUpdateRequest request) {
        request.trainings().forEach(training ->
                validateDateRange(
                        training.startDate(),
                        training.endDate()
                )
        );

        request.careers().forEach(career ->
                validateDateRange(
                        career.startDate(),
                        career.endDate()
                )
        );
    }

    // 날짜 검사 코드
    // 종료일이 시작일보다 빠른지?
    private void validateDateRange(
            LocalDate startDate,
            LocalDate endDate
    ) {
        if (endDate != null && endDate.isBefore(startDate)) {
            throw new BusinessException(
                    ErrorCode.INVALID_RESUME_DATE_RANGE
            );
        }
    }




}
