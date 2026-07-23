package com.aitserver.resume.analysis.service;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.resume.repository.ResumeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ResumeAnalysisWriter {

    private final ResumeRepository resumeRepository;

    @Transactional
    public void save(
            Long resumeId,
            String analysisContent
    ) {
        int updatedCount =
                resumeRepository.updateAnalysisContentOnly(
                        resumeId,
                        analysisContent
                );

        if (updatedCount == 0) {
            throw new BusinessException(
                    ErrorCode.RESUME_NOT_FOUND
            );
        }
    }
}