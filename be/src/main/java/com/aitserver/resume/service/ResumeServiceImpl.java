package com.aitserver.resume.service;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.resume.analysis.event.ResumeAnalysisRequestedEvent;
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

        /*
         * resume는 조회 후 영속 상태이므로 일반적으로 save()가 필요하지 않다.
         * 트랜잭션 종료 시 기존 데이터 DELETE 및 신규 데이터 INSERT가 실행된다.
         */

        // 이 부분에 저장이 다 끝난 후에 gms를 활용해서 gpt5.5로 보냄
        resumeRepository.flush();

        /*
         * 현재 트랜잭션이 정상 커밋된 후
         * ResumeAnalysisEventHandler가 실행된다.
         */
        eventPublisher.publishEvent(
                new ResumeAnalysisRequestedEvent(
                        resume.getId()
                )
        );

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
