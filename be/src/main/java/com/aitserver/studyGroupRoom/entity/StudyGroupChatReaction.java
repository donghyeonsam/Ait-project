package com.aitserver.studyGroupRoom.entity;

import com.aitserver.auth.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "study_group_chat_reactions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_study_group_chat_reactions_chat_user_emoji",
                columnNames = {"chat_id", "user_id", "emoji"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyGroupChatReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_id", nullable = false)
    private StudyGroupChat chat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 32)
    private String emoji;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public StudyGroupChatReaction(StudyGroupChat chat, User user, String emoji) {
        this.chat = chat;
        this.user = user;
        this.emoji = emoji;
    }
}
