package com.aitserver.studygroup.service;

import com.aitserver.studygroup.dto.StudyGroupListResponseDto;
import com.aitserver.studygroup.entity.StudyGroup;
import com.aitserver.studygroup.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyGroupService {

    private final StudyGroupRepository studyGroupRepository;

    public Page<StudyGroupListResponseDto> getStudyGroups(String status, String keyword, Pageable pageable) {
        Page<StudyGroup> studyGroups = studyGroupRepository.findByCondition(status, keyword, pageable);
        return studyGroups.map(StudyGroupListResponseDto::from);
    }
}