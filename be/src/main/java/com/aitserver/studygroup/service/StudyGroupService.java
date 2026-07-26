package com.aitserver.studygroup.service;

import com.aitserver.studygroup.dto.MyStudyGroupResponseDto;
import com.aitserver.studygroup.dto.StudyGroupListResponseDto;
import com.aitserver.studygroup.entity.StudyGroup;
import com.aitserver.studygroup.entity.StudyGroupMember;
import com.aitserver.studygroup.repository.StudyGroupMemberRepository;
import com.aitserver.studygroup.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyGroupService {

    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;

    public Page<StudyGroupListResponseDto> getStudyGroups(String status, String keyword, Pageable pageable) {
        Page<StudyGroup> studyGroups = studyGroupRepository.findByCondition(status, keyword, pageable);
        return studyGroups.map(StudyGroupListResponseDto::from);
    }

    // 1. 내 모든 스터디 그룹
    public List<MyStudyGroupResponseDto> getAllMyStudyGroups(Long userId) {
        List<StudyGroupMember> members = studyGroupMemberRepository.findAllMyStudyGroups(userId, "approved");

        return members.stream()
                .map(MyStudyGroupResponseDto::from)
                .collect(Collectors.toList());
    }

    // 2. 진행 중인(종료되지 않은) 내 스터디 그룹
    public List<MyStudyGroupResponseDto> getActiveMyStudyGroups(Long userId) {
        // 멤버 상태는 "approved" 이면서, 그룹 상태는 "completed"가 아닌 것
        List<StudyGroupMember> members = studyGroupMemberRepository.findActiveMyStudyGroups(userId, "approved", "completed");

        return members.stream()
                .map(MyStudyGroupResponseDto::from)
                .collect(Collectors.toList());
    }
}