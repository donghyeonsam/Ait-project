package com.aitserver.coverletter.service;

import com.aitserver.coverletter.dto.CoverLetterCreateRequest;
import com.aitserver.coverletter.dto.CoverLetterDetailResponse;
import com.aitserver.coverletter.dto.CoverLetterListResponse;
import com.aitserver.coverletter.dto.CoverLetterUpdateRequest;
import org.springframework.stereotype.Service;

@Service
public interface CoverLetterService {

    CoverLetterListResponse getList(Long userId);

    CoverLetterDetailResponse getDetail(Long coverLetterId, Long userId);

    CoverLetterDetailResponse createCoverLetter(Long userId, CoverLetterCreateRequest request);

    CoverLetterDetailResponse updateCoverLetter(Long userId, Long coverLetterId, CoverLetterUpdateRequest request);

    void deleteCoverLetter(Long userId, Long coverLetterId);
}
