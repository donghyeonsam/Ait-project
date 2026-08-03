package com.aitserver.community.entity;

import com.aitserver.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "posts_comments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
//@SQLRestriction("deleted_at IS NULL") // 소프트 딜리트 적용
public class PostComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private PostComment parent;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "like_count", nullable = false)
    private Integer likeCount;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    public PostComment(Post post, User user, PostComment parent, String content) {
        this.post = post;
        this.user = user;
        this.parent = parent;
        this.content = content;
        this.likeCount = 0;
    }

    public boolean isReply() {
        return this.parent != null;
    }

    public void validateCanHaveReply() {
        if (this.isReply()) {
            throw new IllegalArgumentException("답글에는 추가 답글을 작성할 수 없습니다.");
        }
    }

    public void updateContent(String content) {
        this.content = content;
    }

    public void increaseLikeCount() {
        this.likeCount++;
    }

    public void decreaseLikeCount() {
        if (this.likeCount > 0) this.likeCount--;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }
}