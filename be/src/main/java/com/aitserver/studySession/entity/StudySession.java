package com.aitserver.studySession.entity;

import com.aitserver.studyGroupRoom.entity.StudyGroup;
import com.aitserver.studySession.domain.StudySessionStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(
        name = "study_sessions",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_study_sessions_livekit_room_name",
                        columnNames = "livekit_room_name"
                )
        },
        indexes = {
                @Index(
                        name = "idx_study_sessions_group_id",
                        columnList = "group_id"
                ),
                @Index(
                        name = "idx_study_sessions_group_status",
                        columnList = "group_id, status"
                )
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudySession {

    public static final int DEFAULT_MAX_PARTICIPANTS = 8;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "group_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_study_sessions_group"
            )
    )
    private StudyGroup studyGroup;

    @Column(
            name = "livekit_room_name",
            nullable = false,
            length = 100,
            unique = true
    )
    private String liveKitRoomName;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "status",
            nullable = false,
            length = 20
    )
    private StudySessionStatus status;

    @Column(
            name = "max_participants",
            nullable = false
    )
    private Integer maxParticipants;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @CreationTimestamp
    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(
            name = "updated_at",
            nullable = false
    )
    private LocalDateTime updatedAt;

    @Builder
    private StudySession(
            StudyGroup studyGroup,
            String liveKitRoomName,
            Integer maxParticipants
    ) {
        this.studyGroup = studyGroup;
        this.liveKitRoomName = liveKitRoomName;
        this.maxParticipants = maxParticipants == null
                ? DEFAULT_MAX_PARTICIPANTS
                : maxParticipants;
        this.status = StudySessionStatus.WAITING;
    }

    public static StudySession create(
            StudyGroup studyGroup,
            String liveKitRoomName
    ) {
        return StudySession.builder()
                .studyGroup(studyGroup)
                .liveKitRoomName(liveKitRoomName)
                .maxParticipants(DEFAULT_MAX_PARTICIPANTS)
                .build();
    }

    public void start() {
        if (this.status == StudySessionStatus.ENDED) {
            throw new IllegalStateException(
                    "종료된 스터디 세션은 다시 시작할 수 없습니다."
            );
        }

        if (this.status == StudySessionStatus.IN_PROGRESS) {
            return;
        }

        this.status = StudySessionStatus.IN_PROGRESS;

        if (this.startedAt == null) {
            this.startedAt = LocalDateTime.now();
        }
    }

    public void end() {
        if (this.status == StudySessionStatus.ENDED) {
            return;
        }

        this.status = StudySessionStatus.ENDED;
        this.endedAt = LocalDateTime.now();
    }

    public boolean isEnded() {
        return this.status == StudySessionStatus.ENDED;
    }

    public boolean isJoinable() {
        return this.status != StudySessionStatus.ENDED;
    }
}