package com.aitserver.coverletter.analysis.service;

import com.aitserver.coverletter.analysis.dto.CoverLetterAnalysisContext;
import com.aitserver.coverletter.analysis.dto.CoverLetterAnalysisSource;
import com.aitserver.coverletter.entity.CoverLetter;
import com.aitserver.coverletter.repository.CoverLetterRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CoverLetterAnalysisReader {

    private final CoverLetterRepository coverLetterRepository;

    @Transactional(readOnly = true)
    public CoverLetterAnalysisContext read(
            Long coverLetterId
    ) {
        CoverLetter coverLetter = coverLetterRepository
                .findForAnalysis(coverLetterId)
                .orElseThrow(() ->
                        new BusinessException(
                                ErrorCode.COVER_LETTER_NOT_FOUND
                        )
                );

        return new CoverLetterAnalysisContext(
                coverLetter.getUser().getId(),
                CoverLetterAnalysisSource.from(coverLetter)
        );
    }
}