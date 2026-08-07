package com.aitserver.studyGroupRoom.entity;

import com.aitserver.studyGroupRoom.enums.FileType;
import com.aitserver.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "study_group_files")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyGroupFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private StudyGroup studyGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_id", nullable = false)
    private StudyGroupChat chat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "stored_filename", nullable = false)
    private String storedFilename;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", nullable = false)
    private FileType fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public StudyGroupFile(StudyGroup studyGroup, StudyGroupChat chat, User user,
                          String originalFilename, String storedFilename,
                          FileType fileType, Long fileSize) {
        this.studyGroup = studyGroup;
        this.chat = chat;
        this.user = user;
        this.originalFilename = originalFilename;
        this.storedFilename = storedFilename;
        this.fileType = fileType != null ? fileType : FileType.OTHER;
        this.fileSize = fileSize;
    }

    // 양방향 연관관계 세팅을 위한 내부 메서드
    protected void assignChat(StudyGroupChat chat) {
        this.chat = chat;
    }
}