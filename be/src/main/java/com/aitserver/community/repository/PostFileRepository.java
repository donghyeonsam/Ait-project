package com.aitserver.community.repository;

import com.aitserver.community.entity.PostFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostFileRepository extends JpaRepository<PostFile, Long> {

    // 게시글의 모든 파일 조회
    List<PostFile> findByPostId(Long postId);

    // 용도에 따른 파일 조회 (예: 다운로드용 ATTACHMENT만 모아보기)
    List<PostFile> findByPostIdAndUsageType(Long postId, PostFile.UsageType usageType);
}