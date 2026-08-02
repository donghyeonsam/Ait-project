package com.aitserver.auth.repository;

import com.aitserver.auth.entity.SocialUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SocialUserRepository extends JpaRepository<SocialUser, Long> {

    Optional<SocialUser> findByProviderAndProviderId(String provider, String providerId);

    boolean existsByProviderAndProviderId(String provider, String providerId);
}