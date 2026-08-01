package com.aitserver.community.repository;

import com.aitserver.community.entity.PostFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostFileRepository extends JpaRepository<PostFile, Long> {

    // 게시글의 모든 파일 조회
    List<PostFile> findByPostId(Long postId);

    List<PostFile> findByPostIdInAndUsageType(List<Long> postIds, PostFile.UsageType usageType);
}