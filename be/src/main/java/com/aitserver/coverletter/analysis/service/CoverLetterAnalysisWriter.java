package com.aitserver.coverletter.analysis.service;

import com.aitserver.coverletter.entity.CoverLetter;
import com.aitserver.coverletter.repository.CoverLetterRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@RequiredArgsConstructor
public class CoverLetterAnalysisWriter {

    private final CoverLetterRepository coverLetterRepository;

    @Transactional
    public void save(
            Long coverLetterId,
            String analysisContent
    ) {
        int updatedCount =
                coverLetterRepository.updateAnalysisContentOnly(
                        coverLetterId,
                        analysisContent
                );

        if (updatedCount == 0) {
            throw new BusinessException(
                    ErrorCode.COVER_LETTER_NOT_FOUND
            );
        }
    }
}