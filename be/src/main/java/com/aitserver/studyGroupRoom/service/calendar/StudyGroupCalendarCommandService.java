package com.aitserver.studyGroupRoom.service.calendar;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.studyGroupRoom.dto.calendar.CalendarRequest;
import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studyGroupRoom.entity.StudyGroupCalendar;
import com.aitserver.studyGroupRoom.repository.StudyGroupCalendarRepository;
import com.aitserver.studyGroupRoom.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class StudyGroupCalendarCommandService {

    private final StudyGroupCalendarRepository calendarRepository;
    private final StudyGroupRepository studyGroupRepository;

    // 방장 검증
    private StudyGroup validateGroupOwner(Long groupId, Long userId) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.GROUP_NOT_FOUND));

        if (!group.isOwner(userId)) {
            throw new BusinessException(ErrorCode.NOT_GROUP_OWNER); // 방장만 접근 가능
        }
        return group;
    }

    // 1. 일정 등록
    public void createCalendar(Long groupId, Long currentUserId, CalendarRequest request) {
        StudyGroup group = validateGroupOwner(groupId, currentUserId);

        StudyGroupCalendar calendar = StudyGroupCalendar.builder()
                .studyGroup(group)
                .content(request.getContent())
                .startTime(request.getStartTime())
                .build();

        calendarRepository.save(calendar);
    }

    // 2. 일정 수정
    public void updateCalendar(Long groupId, Long calendarId, Long currentUserId, CalendarRequest request) {
        validateGroupOwner(groupId, currentUserId);

        StudyGroupCalendar calendar = calendarRepository.findById(calendarId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CALENDAR_NOT_FOUND));

        // 해당 일정이 요청한 그룹의 일정이 맞는지 검증
        if (!calendar.getStudyGroup().getId().equals(groupId)) {
            throw new BusinessException(ErrorCode.INVALID_CALENDAR_GROUP);
        }

        calendar.update(request.getContent(), request.getStartTime());
    }

    // 3. 일정 삭제
    public void deleteCalendar(Long groupId, Long calendarId, Long currentUserId) {
        validateGroupOwner(groupId, currentUserId);

        StudyGroupCalendar calendar = calendarRepository.findById(calendarId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CALENDAR_NOT_FOUND));

        if (!calendar.getStudyGroup().getId().equals(groupId)) {
            throw new BusinessException(ErrorCode.INVALID_CALENDAR_GROUP);
        }

        calendar.deleteCalendar();
    }
}