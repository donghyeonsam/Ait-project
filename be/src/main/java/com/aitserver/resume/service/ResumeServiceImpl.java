package com.aitserver.resume.service;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.resume.dto.ResumeResponse;
import com.aitserver.resume.entity.Resume;
import org.springframework.stereotype.Service;

@Service
public class ResumeServiceImpl implements ResumeService{

    @Override
    public ResumeResponse getMyResume(Long userId) {
        Resume resume = resumeRepository.findByUser_Id(userId)
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.RESUME_NOT_FOUND)
                );

        return ResumeResponse.from(resume);
    }

    @Override
    public ResumeResponse getResume(Long resumeId) {
        return null;
    }
}
