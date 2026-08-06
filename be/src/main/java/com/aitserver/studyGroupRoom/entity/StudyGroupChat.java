package com.aitserver.studyGroupRoom.entity;

import com.aitserver.studyGroupRoom.enums.ChatType;
import com.aitserver.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "study_group_chats")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyGroupChat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private StudyGroup studyGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "chat_type", nullable = false)
    private ChatType chatType;

    @Column(length = 255)
    private String message;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "chat", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<StudyGroupChatReaction> reactions = new ArrayList<>();

    @OneToMany(mappedBy = "chat", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StudyGroupFile> files = new ArrayList<>();

    @Builder
    public StudyGroupChat(StudyGroup studyGroup, User user, ChatType chatType, String message) {
        this.studyGroup = studyGroup;
        this.user = user;
        this.chatType = chatType != null ? chatType : ChatType.TEXT;
        this.message = message;
    }

    public void addFile(StudyGroupFile file) {
        this.files.add(file);
        file.assignChat(this);
    }
}
