package com.aitserver.aiInterview.repository;

import com.aitserver.aiInterview.dto.GithubRepoInfoForAiInterview;
import com.aitserver.github.entity.GithubRepo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AiInterviewGithubRepoRepository extends JpaRepository<GithubRepo, Long> {

    @Query("SELECT new com.aitserver.aiInterview.dto.GithubRepoInfoForAiInterview(" +
            "g.id, g.repoName, g.repoNickname, g.createdAt) " +
            "FROM GithubRepo g " +
            "WHERE g.githubApp.userId = :userId " +
            "ORDER BY g.createdAt DESC")
    List<GithubRepoInfoForAiInterview> findGithubRepoInfoByUserId(@Param("userId") Long userId);
}
