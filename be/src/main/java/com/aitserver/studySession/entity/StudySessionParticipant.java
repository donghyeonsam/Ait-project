package com.aitserver.studySession.entity;

import com.aitserver.auth.entity.User;
import com.aitserver.studySession.domain.StudySessionParticipantRole;
import com.aitserver.studySession.domain.StudySessionParticipantStatus;
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
        name = "study_session_participants",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_study_session_participant",
                        columnNames = {
                                "session_id",
                                "user_id"
                        }
                )
        },
        indexes = {
                @Index(
                        name = "idx_study_session_participants_session_id",
                        columnList = "session_id"
                ),
                @Index(
                        name = "idx_study_session_participants_user_id",
                        columnList = "user_id"
                ),
                @Index(
                        name = "idx_study_session_participants_session_status",
                        columnList = "session_id, status"
                )
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudySessionParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "session_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_study_session_participants_session"
            )
    )
    private StudySession studySession;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "user_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_study_session_participants_user"
            )
    )
    private User user;

    @Column(name = "resume_id")
    private Long resumeId;

    @Column(name = "cover_letter_id")
    private Long coverLetterId;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "role",
            nullable = false,
            length = 20
    )
    private StudySessionParticipantRole role;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "status",
            nullable = false,
            length = 20
    )
    private StudySessionParticipantStatus status;

    @Column(name = "first_joined_at")
    private LocalDateTime firstJoinedAt;

    @Column(name = "last_left_at")
    private LocalDateTime lastLeftAt;

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
    private StudySessionParticipant(
            StudySession studySession,
            User user,
            StudySessionParticipantRole role
    ) {
        this.studySession = studySession;
        this.user = user;
        this.role = role;
        this.status = StudySessionParticipantStatus.JOINED;
        this.firstJoinedAt = LocalDateTime.now();
    }

    public static StudySessionParticipant join(
            StudySession studySession,
            User user,
            StudySessionParticipantRole role
    ) {
        return StudySessionParticipant.builder()
                .studySession(studySession)
                .user(user)
                .role(role)
                .build();
    }

    public void rejoin(
            StudySessionParticipantRole role
    ) {
        if (this.status == StudySessionParticipantStatus.KICKED) {
            throw new IllegalStateException(
                    "강퇴된 사용자는 세션에 재입장할 수 없습니다."
            );
        }

        this.role = role;
        this.status = StudySessionParticipantStatus.JOINED;

        if (this.firstJoinedAt == null) {
            this.firstJoinedAt = LocalDateTime.now();
        }
    }

    public void leave() {
        if (this.status == StudySessionParticipantStatus.KICKED) {
            return;
        }

        this.status = StudySessionParticipantStatus.LEFT;
        this.lastLeftAt = LocalDateTime.now();
    }

    public void kick() {
        this.status = StudySessionParticipantStatus.KICKED;
        this.lastLeftAt = LocalDateTime.now();
    }

    public boolean isJoined() {
        return this.status == StudySessionParticipantStatus.JOINED;
    }

    public boolean isKicked() {
        return this.status == StudySessionParticipantStatus.KICKED;
    }

    public static StudySessionParticipant connect(
            StudySession studySession,
            User user,
            StudySessionParticipantRole role,
            Long resumeId,
            Long coverLetterId
    ) {
        StudySessionParticipant participant =
                new StudySessionParticipant();

        participant.studySession = studySession;
        participant.user = user;
        participant.role = role;

        participant.resumeId = resumeId;
        participant.coverLetterId = coverLetterId;

        participant.status =
                StudySessionParticipantStatus.CONNECTING;

        return participant;
    }


    public void reconnect(
            StudySessionParticipantRole role,
            Long resumeId,
            Long coverLetterId
    ) {
        if (this.status
                == StudySessionParticipantStatus.KICKED) {
            throw new IllegalStateException(
                    "강퇴된 참가자는 다시 입장할 수 없습니다."
            );
        }

        this.role = role;
        this.resumeId = resumeId;
        this.coverLetterId = coverLetterId;

        /*
         * 이미 실제 접속 중인 상태에서 API가 중복 호출된 경우
         * JOINED를 다시 CONNECTING으로 변경하지 않습니다.
         */
        if (this.status
                != StudySessionParticipantStatus.JOINED) {
            this.status =
                    StudySessionParticipantStatus.CONNECTING;
        }
    }

    public void join() {
        if (this.status
                == StudySessionParticipantStatus.KICKED) {
            throw new IllegalStateException(
                    "강퇴된 참가자는 입장할 수 없습니다."
            );
        }

        this.status =
                StudySessionParticipantStatus.JOINED;

        if (this.firstJoinedAt == null) {
            this.firstJoinedAt =
                    LocalDateTime.now();
        }

        this.lastLeftAt = null;
    }

}