package com.aitserver.user.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "user_skills",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_user_skills_user_skill",
                        columnNames = {"user_id", "skill"}
                )
        },
        indexes = {
                @Index(name = "idx_user_skills_user_id", columnList = "user_id")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // users 테이블과의 연관관계 대신 성능 및 결합도를 낮추기 위해 userId(Long) 직접 사용
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "skill", length = 20, nullable = false)
    private String skill;

    @Builder
    public UserSkill(Long userId, String skill) {
        this.userId = userId;
        this.skill = skill;
    }
}