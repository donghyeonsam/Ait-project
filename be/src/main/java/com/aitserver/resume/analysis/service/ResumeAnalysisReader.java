package com.aitserver.resume.analysis.service;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.resume.analysis.dto.ResumeAnalysisContext;
import com.aitserver.resume.analysis.dto.ResumeAnalysisSource;
import com.aitserver.resume.entity.Resume;
import com.aitserver.resume.repository.ResumeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ResumeAnalysisReader {

    private final ResumeRepository resumeRepository;

    @Transactional(readOnly = true)
    public ResumeAnalysisContext read(Long resumeId) {
        Resume resume = resumeRepository.findById(resumeId)
                .orElseThrow(() ->
                        new BusinessException(
                                ErrorCode.RESUME_NOT_FOUND
                        )
                );

        return new ResumeAnalysisContext(
                resume.getUser().getId(),
                ResumeAnalysisSource.from(resume)
        );
    }
}