package com.aitserver.studyGroupRoom.repository;

import com.aitserver.studyGroupRoom.domain.StudyGroupMemberStatus;
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


    @Query("""
            SELECT calendar
            FROM StudyGroupCalendar calendar
            JOIN FETCH calendar.studyGroup studyGroup
            WHERE calendar.deletedAt IS NULL
              AND studyGroup.deletedAt IS NULL
              AND calendar.startTime >= :startAt
              AND calendar.startTime < :endAt
              AND (
                    studyGroup.owner.id = :userId
                    OR EXISTS (
                        SELECT member.id
                        FROM StudyGroupMember member
                        WHERE member.studyGroup.id = studyGroup.id
                          AND member.user.id = :userId
                          AND member.status = :memberStatus
                          AND member.deletedAt IS NULL
                    )
              )
            ORDER BY calendar.startTime ASC
            """)
    List<StudyGroupCalendar> findMyCalendarsBetween(
            @Param("userId") Long userId,
            @Param("memberStatus")
            StudyGroupMemberStatus memberStatus,
            @Param("startAt") LocalDateTime startAt,
            @Param("endAt") LocalDateTime endAt
    );

}