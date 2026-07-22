package com.aitserver.resume.repository;

import com.aitserver.resume.entity.Resume;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface ResumeRepository extends JpaRepository<Resume, Long> {

    Optional<Resume> findByUser_Id(Long userId);

    // 분석용 (updated at 변경 방지)
    @Modifying(
            flushAutomatically = true,
            clearAutomatically = true
    )
    @Query(
            value = """
                    UPDATE resumes
                    SET analysis_content = :analysisContent
                    WHERE id = :resumeId
                    """,
            nativeQuery = true
    )
    int updateAnalysisContentOnly(
            @Param("resumeId") Long resumeId,
            @Param("analysisContent") String analysisContent
    );
}