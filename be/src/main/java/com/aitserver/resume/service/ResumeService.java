package com.aitserver.resume.service;

import com.aitserver.resume.dto.ResumeResponse;

public interface ResumeService {
    ResumeResponse getMyResume(Long userId);
    ResumeResponse getResume(Long resumeId);
}
