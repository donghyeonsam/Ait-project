package com.aitserver.coverletter.repository;

import com.aitserver.coverletter.entity.CoverLetter;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CoverLetterRepository extends JpaRepository<CoverLetter, Long> {

    List<CoverLetter> findAllByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(
            Long userId
    );

    @EntityGraph(attributePaths = "contents")
    Optional<CoverLetter> findByIdAndUserIdAndDeletedAtIsNull(
            Long coverLetterId,
            Long userId
    );

    // 삭제용
    @Query("""
        SELECT c
        FROM CoverLetter c
        WHERE c.id = :coverLetterId
          AND c.user.id = :userId
          AND c.deletedAt IS NULL
    """)
    Optional<CoverLetter> findDeleteTarget(
            @Param("coverLetterId") Long coverLetterId,
            @Param("userId") Long userId
    );


    // 분석용
    @EntityGraph(attributePaths = "contents")
    @Query("""
            select distinct cl
            from CoverLetter cl
            where cl.id = :coverLetterId
              and cl.deletedAt is null
            """)
    Optional<CoverLetter> findForAnalysis(
            @Param("coverLetterId")
            Long coverLetterId
    );

    Optional<CoverLetter> findByIdAndDeletedAtIsNull(
            Long coverLetterId
    );
}
