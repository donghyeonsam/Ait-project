package com.aitserver.studyGroupRoom.service.chat;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.studyGroupRoom.dto.chat.StudyGroupFileDto;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.entity.StudyGroupFile;
import com.aitserver.studyGroupRoom.enums.FileType;
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

    public Page<StudyGroupFileDto.Response> getGroupFiles(
            Long groupId, Long userId, String type, Pageable pageable) {

        StudyGroup studyGroup = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_GROUP_NOT_FOUND));
        studyGroup.validateMember(userId);

        Page<StudyGroupFile> filePage;

        if ("image".equalsIgnoreCase(type)) {
            filePage = fileRepository.findByGroupIdAndFileType(groupId, FileType.IMAGE, pageable);
        } else if ("other".equalsIgnoreCase(type)) {
            filePage = fileRepository.findByGroupIdAndFileTypeNot(groupId, FileType.IMAGE, pageable);
        } else {
            filePage = fileRepository.findFilesByGroupIdWithUser(groupId, pageable);
        }

        return filePage.map(StudyGroupFileDto.Response::from);
    }
}