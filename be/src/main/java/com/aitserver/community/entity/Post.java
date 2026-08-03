package com.aitserver.community.entity;

import com.aitserver.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Formula;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "posts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLRestriction("deleted_at IS NULL")
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "allow_comments", nullable = false)
    private Boolean allowComments;

    @Column(name = "receive_notifications", nullable = false)
    private Boolean receiveNotifications;

    @Column(name = "like_count", nullable = false)
    private Integer likeCount;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount;

    @Formula("(SELECT COUNT(*) FROM posts_comments c WHERE c.post_id = id AND c.deleted_at IS NULL)")
    private int commentCount;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    public Post(User user, String category, String title, String content, Boolean allowComments, Boolean receiveNotifications) {
        this.user = user;
        this.category = category;
        this.title = title;
        this.content = content;
        this.allowComments = allowComments != null ? allowComments : true;
        this.receiveNotifications = receiveNotifications != null ? receiveNotifications : true;
        this.likeCount = 0;
        this.viewCount = 0;
    }

    public void update(String title, String content, String category, Boolean allowComments, Boolean receiveNotifications) {
        this.title = title;
        this.content = content;
        this.category = category;
        this.allowComments = allowComments;
        this.receiveNotifications = receiveNotifications;
    }

    public void increaseLikeCount() {
        this.likeCount++;
    }

    public void decreaseLikeCount() {
        if (this.likeCount > 0) this.likeCount--;
    }

    public void increaseViewCount() {
        this.viewCount++;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }
}