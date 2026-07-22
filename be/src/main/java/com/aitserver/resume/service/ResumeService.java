package com.aitserver.resume.service;

import com.aitserver.resume.dto.ResumeResponse;
import com.aitserver.resume.dto.ResumeUpdateRequest;

public interface ResumeService {
    ResumeResponse getMyResume(Long userId);
    ResumeResponse getResume(Long resumeId);

    ResumeResponse updateResume(
            Long resumeId,
            Long userId,
            ResumeUpdateRequest request
    );
}
