package com.aitserver.github.repository;

import com.aitserver.github.entity.GithubRepo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface GithubRepoRepository extends JpaRepository<GithubRepo, Long> {
    // 깃허브 앱(연동 정보) PK로 저장된 레포지토리 목록을 불러오는 메서드
    List<GithubRepo> findByGithubAppId(Long githubAppId);

    // 기존에 이미 저장된 레포지토리인지 확인하기 위함
    boolean existsByGithubAppIdAndRepoId(Long githubAppId, Long repoId);

    Optional<GithubRepo> findByIdAndGithubAppUserId(Long id, Long userId);

    // 내 정보 조회시 레포 리스트 가져오기 위함
    List<GithubRepo> findAllByGithubApp_IdOrderByIdAsc(Long githubAppId);

    List<GithubRepo> findAllByIdInAndGithubApp_Id(Collection<Long> ids, Long githubAppId);
}