package com.aitserver.studyGroupRoom.repository;

import com.aitserver.studyGroupRoom.entity.StudyGroupCalendar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface StudyGroupCalendarRepository extends JpaRepository<StudyGroupCalendar, Long> {

    @Query("SELECT c FROM StudyGroupCalendar c " +
            "WHERE c.studyGroup.id = :groupId " +
            "AND c.startTime >= :startOfMonth " +
            "AND c.startTime < :startOfNextMonth " +
            "ORDER BY c.startTime ASC")
    List<StudyGroupCalendar> findMonthlyCalendars(
            @Param("groupId") Long groupId,
            @Param("startOfMonth") LocalDateTime startOfMonth,
            @Param("startOfNextMonth") LocalDateTime startOfNextMonth
    );

    @Query("SELECT c FROM StudyGroupCalendar c " +
            "WHERE c.studyGroup.id = :groupId " +
            "AND c.startTime >= :startOfDay " +
            "AND c.startTime < :startOfNextDay " +
            "ORDER BY c.startTime ASC")
    List<StudyGroupCalendar> findDailyCalendars(
            @Param("groupId") Long groupId,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("startOfNextDay") LocalDateTime startOfNextDay
    );
}