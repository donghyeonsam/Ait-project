package com.aitserver.github.repository;

import com.aitserver.github.entity.GithubApp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GithubAppRepository extends JpaRepository<GithubApp, Long> {
    // 유저 ID로 깃허브 연동 정보를 찾는 메서드
    Optional<GithubApp> findByUserId(Long userId);
}