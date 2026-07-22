package com.aitserver.coverletter.entity;

import com.aitserver.auth.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cover_letter")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CoverLetter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // CoverLetter : User = N : 1
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "title", length = 50, nullable = false)
    private String title;

    @Column(name = "company_name", length = 100, nullable = false)
    private String companyName;

    @Column(name = "role", length = 50, nullable = false)
    private String role;

    @Column(name = "analysis_content", columnDefinition = "TEXT")
    private String analysisContent;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /*
     * 자기소개서 하나에는 여러 개의 질문/답변이 포함된다.
     *
     * cascade = ALL:
     * CoverLetter를 저장하면 CoverLetterContent도 함께 저장
     *
     * orphanRemoval = true:
     * contents 리스트에서 제거된 데이터를 DB에서도 삭제
     */
    @OneToMany(
            mappedBy = "coverLetter",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @OrderBy("contentOrder ASC")
    private List<CoverLetterContent> contents = new ArrayList<>();

    @Builder
    private CoverLetter(
            User user,
            String title,
            String companyName,
            String role
    ) {
        this.user = user;
        this.title = title;
        this.companyName = companyName;
        this.role = role;
    }

    /*
     * 양방향 연관관계 편의 메서드
     */
    public void addContent(CoverLetterContent content) {
        contents.add(content);
        content.assignCoverLetter(this);
    }

    public void removeContent(CoverLetterContent content) {
        contents.remove(content);
        content.assignCoverLetter(null);
    }

    public void updateBasicInfo(
            String title,
            String companyName,
            String role
    ) {
        this.title = title;
        this.companyName = companyName;
        this.role = role;
    }

    public void updateAnalysisContent(String analysisContent) {
        this.analysisContent = analysisContent;
    }

    public void softDelete() {
        this.deletedAt = LocalDateTime.now();
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }


    public void clearContents() {
        List<CoverLetterContent> existingContents =
                new ArrayList<>(this.contents);

        for (CoverLetterContent content : existingContents) {
            removeContent(content);
        }
    }

    public void clearAnalysisContent() {
        this.analysisContent = null;
    }




}