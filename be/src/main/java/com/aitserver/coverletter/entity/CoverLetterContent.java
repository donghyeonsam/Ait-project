package com.aitserver.coverletter.entity;

import com.aitserver.coverletter.entity.CoverLetter;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "cover_letter_contents",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_cover_letter_content_order",
                        columnNames = {"cover_letter_id", "content_order"}
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CoverLetterContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // CoverLetterContent : CoverLetter = N : 1
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cover_letter_id", nullable = false)
    private CoverLetter coverLetter;

    @Column(name = "content_order", nullable = false)
    private Integer contentOrder;

    @Column(name = "question", length = 255, nullable = false)
    private String question;

    @Column(name = "answer", columnDefinition = "TEXT", nullable = false)
    private String answer;

    @Builder
    private CoverLetterContent(
            Integer contentOrder,
            String question,
            String answer
    ) {
        this.contentOrder = contentOrder;
        this.question = question;
        this.answer = answer;
    }

    /*
     * CoverLetter의 addContent()를 통해 호출하도록
     * package-private으로 설정
     */
    void assignCoverLetter(CoverLetter coverLetter) {
        this.coverLetter = coverLetter;
    }

    public void update(
            Integer contentOrder,
            String question,
            String answer
    ) {
        this.contentOrder = contentOrder;
        this.question = question;
        this.answer = answer;
    }
}