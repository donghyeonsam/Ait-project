package com.aitserver.studyGroupRoom.service.chat;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.studyGroupRoom.dto.chat.StudyGroupFileDto;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.repository.StudyGroupFileRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyGroupFileService {

    private final StudyGroupFileRepository fileRepository;
    private final StudyGroupRepository studyGroupRepository;

    public Page<StudyGroupFileDto.Response> getGroupFiles(Long groupId, Long userId, Pageable pageable) {
        // 1. 그룹 조회 및 존재 여부 확인
        StudyGroup studyGroup = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_GROUP_NOT_FOUND));

        // 2. 권한 확인 (해당 사용자가 스터디 그룹 멤버인지)
        studyGroup.validateMember(userId);

        // 3. 파일 목록 조회 (Fetch Join 적용됨)
        return fileRepository.findFilesByGroupIdWithUser(groupId, pageable)
                .map(StudyGroupFileDto.Response::from);
    }
}