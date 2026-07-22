-- =========================================================
-- 외래키 관계를 고려한 테이블 삭제
-- 자식 테이블부터 부모 테이블 순서로 삭제
-- =========================================================
DROP TABLE IF EXISTS `cover_letter_contents`;
DROP TABLE IF EXISTS `cover_letter`;
DROP TABLE IF EXISTS `resume_projects`;
DROP TABLE IF EXISTS `resume_trainings`;
DROP TABLE IF EXISTS `resume_careers`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `github_repos`;
DROP TABLE IF EXISTS `github_apps`;
DROP TABLE IF EXISTS `resumes`;
DROP TABLE IF EXISTS `users`;


-- =========================================================
-- 사용자 정보
-- =========================================================

CREATE TABLE `users` (
                         `id` BIGINT NOT NULL AUTO_INCREMENT,
                         `email` VARCHAR(255) NOT NULL,
                         `password` VARCHAR(255) NOT NULL,
                         `name` VARCHAR(20) NOT NULL,
                         `nickname` VARCHAR(20) NOT NULL,
                         `role` VARCHAR(20) NOT NULL DEFAULT 'USER',
                         `first_job_interest` VARCHAR(30) DEFAULT NULL,
                         `second_job_interest` VARCHAR(30) DEFAULT NULL,
                         `profile_image` VARCHAR(255) DEFAULT NULL,
                         `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
                         `deleted_at` DATETIME DEFAULT NULL,

                         PRIMARY KEY (`id`),
                         UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='사용자 정보';


-- =========================================================
-- GitHub App 연동 정보
-- users 참조
-- =========================================================

CREATE TABLE `github_apps` (
                               `id` BIGINT NOT NULL AUTO_INCREMENT,
                               `user_id` BIGINT NOT NULL,
                               `installation_id` VARCHAR(255) NOT NULL,
                               `github_username` VARCHAR(30) NOT NULL,
                               `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

                               PRIMARY KEY (`id`),

                               UNIQUE KEY `uk_github_apps_installation_id` (`installation_id`),
                               KEY `idx_github_apps_user_id` (`user_id`),

                               CONSTRAINT `fk_github_apps_user`
                                   FOREIGN KEY (`user_id`)
                                       REFERENCES `users` (`id`)
                                       ON DELETE CASCADE
                                       ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='깃허브 앱 연동 정보';


-- =========================================================
-- GitHub 레포지토리 정보
-- github_apps 참조
-- =========================================================

CREATE TABLE `github_repos` (
                                `id` BIGINT NOT NULL AUTO_INCREMENT,
                                `github_app_id` BIGINT NOT NULL,
                                `repo_id` BIGINT NOT NULL,
                                `repo_name` VARCHAR(100) NOT NULL,
                                `repo_nickname` VARCHAR(100) NOT NULL,
                                `analysis_content` TEXT DEFAULT NULL,
                                `is_private` BOOLEAN NOT NULL DEFAULT FALSE,
                                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

                                PRIMARY KEY (`id`),

                                UNIQUE KEY `uk_github_repos_app_repo`
                                    (`github_app_id`, `repo_id`),

                                KEY `idx_github_repos_github_app_id`
                                    (`github_app_id`),

                                CONSTRAINT `fk_github_repos_github_app`
                                    FOREIGN KEY (`github_app_id`)
                                        REFERENCES `github_apps` (`id`)
                                        ON DELETE CASCADE
                                        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='깃허브 레포지토리 정보';


-- =========================================================
-- 이력서 정보
-- users 참조
-- =========================================================

CREATE TABLE `resumes` (
                           `id` BIGINT NOT NULL AUTO_INCREMENT,
                           `user_id` BIGINT NOT NULL,
                           `analysis_content` TEXT DEFAULT NULL,
                           `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           `updated_at` DATETIME DEFAULT NULL,

                           PRIMARY KEY (`id`),

                           KEY `idx_resumes_user_id` (`user_id`),

                           CONSTRAINT `fk_resumes_user`
                               FOREIGN KEY (`user_id`)
                                   REFERENCES `users` (`id`)
                                   ON DELETE CASCADE
                                   ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='이력서 정보';


-- =========================================================
-- 학력 및 교육 이수 내역
-- resumes 참조
-- =========================================================

CREATE TABLE `resume_trainings` (
                                    `id` BIGINT NOT NULL AUTO_INCREMENT,
                                    `resume_id` BIGINT NOT NULL,
                                    `start_date` DATE NOT NULL,
                                    `end_date` DATE NOT NULL,
                                    `organization` VARCHAR(50) NOT NULL,
                                    `course` VARCHAR(50) NOT NULL,
                                    `description` TEXT NOT NULL,

                                    PRIMARY KEY (`id`),

                                    KEY `idx_resume_trainings_resume_id` (`resume_id`),

                                    CONSTRAINT `fk_resume_trainings_resume`
                                        FOREIGN KEY (`resume_id`)
                                            REFERENCES `resumes` (`id`)
                                            ON DELETE CASCADE
                                            ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='학력 및 교육 이수 내역';


-- =========================================================
-- 기타 경력 사항
-- resumes 참조
-- =========================================================

CREATE TABLE `resume_careers` (
                                  `id` BIGINT NOT NULL AUTO_INCREMENT,
                                  `resume_id` BIGINT NOT NULL,
                                  `start_date` DATE NOT NULL,
                                  `end_date` DATE DEFAULT NULL,
                                  `company_name` VARCHAR(100) NOT NULL,
                                  `role` VARCHAR(50) NOT NULL,
                                  `description` TEXT NOT NULL,

                                  PRIMARY KEY (`id`),

                                  KEY `idx_resume_careers_resume_id` (`resume_id`),

                                  CONSTRAINT `fk_resume_careers_resume`
                                      FOREIGN KEY (`resume_id`)
                                          REFERENCES `resumes` (`id`)
                                          ON DELETE CASCADE
                                          ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='이력서 기타 경력 사항';


-- =========================================================
-- 이력서 프로젝트 경험
-- resumes, github_repos 참조
-- =========================================================

CREATE TABLE `resume_projects` (
                                   `id` BIGINT NOT NULL AUTO_INCREMENT,
                                   `resume_id` BIGINT NOT NULL,
                                   `github_repo_id` BIGINT DEFAULT NULL,
                                   `project_name` VARCHAR(50) NOT NULL,
                                   `tech_stacks` VARCHAR(255) NOT NULL,
                                   `role` VARCHAR(50) NOT NULL,
                                   `description` TEXT NOT NULL,

                                   PRIMARY KEY (`id`),

                                   KEY `idx_resume_projects_resume_id`
                                       (`resume_id`),

                                   KEY `idx_resume_projects_github_repo_id`
                                       (`github_repo_id`),

                                   CONSTRAINT `fk_resume_projects_resume`
                                       FOREIGN KEY (`resume_id`)
                                           REFERENCES `resumes` (`id`)
                                           ON DELETE CASCADE
                                           ON UPDATE CASCADE,

                                   CONSTRAINT `fk_resume_projects_github_repo`
                                       FOREIGN KEY (`github_repo_id`)
                                           REFERENCES `github_repos` (`id`)
                                           ON DELETE SET NULL
                                           ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='이력서에 포함되는 프로젝트 경험';


-- =========================================================
-- 사용자 알림
-- users 참조
-- target_id는 type에 따라 참조 대상이 달라지므로 FK 미설정
-- =========================================================

CREATE TABLE `notifications` (
                                 `id` BIGINT NOT NULL AUTO_INCREMENT,
                                 `user_id` BIGINT NOT NULL,
                                 `type` VARCHAR(30) NOT NULL,
                                 `target_id` BIGINT NOT NULL,
                                 `content` TEXT NOT NULL,
                                 `is_checked` BOOLEAN NOT NULL DEFAULT FALSE,
                                 `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 `deleted_at` DATETIME DEFAULT NULL,

                                 PRIMARY KEY (`id`),

                                 KEY `idx_notifications_user_id`
                                     (`user_id`),

                                 KEY `idx_notifications_user_checked_created`
                                     (`user_id`, `is_checked`, `created_at`),

                                 CONSTRAINT `fk_notifications_user`
                                     FOREIGN KEY (`user_id`)
                                         REFERENCES `users` (`id`)
                                         ON DELETE CASCADE
                                         ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='사용자 알림';

CREATE TABLE `cover_letter` (
                                `id` BIGINT NOT NULL AUTO_INCREMENT,
                                `user_id` BIGINT NOT NULL,
                                `title` VARCHAR(50) NOT NULL,
                                `company_name` VARCHAR(100) NOT NULL,
                                `role` VARCHAR(50) NOT NULL,
                                `analysis_content` TEXT DEFAULT NULL,
                                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                `updated_at` DATETIME DEFAULT NULL,
                                `deleted_at` DATETIME DEFAULT NULL,

                                PRIMARY KEY (`id`),

                                KEY `idx_cover_letter_user_id` (`user_id`),
                                KEY `idx_cover_letter_deleted_at` (`deleted_at`),

                                CONSTRAINT `fk_cover_letter_user`
                                    FOREIGN KEY (`user_id`)
                                        REFERENCES `users` (`id`)
                                        ON DELETE CASCADE
                                        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='자기소개서 기본 정보';


CREATE TABLE `cover_letter_contents` (
                                         `id` BIGINT NOT NULL AUTO_INCREMENT,
                                         `cover_letter_id` BIGINT NOT NULL,
                                         `content_order` INT NOT NULL,
                                         `question` VARCHAR(255) NOT NULL,
                                         `answer` TEXT NOT NULL,

                                         PRIMARY KEY (`id`),

                                         UNIQUE KEY `uk_cover_letter_contents_order`
                                             (`cover_letter_id`, `content_order`),

                                         KEY `idx_cover_letter_contents_cover_letter_id`
                                             (`cover_letter_id`),

                                         CONSTRAINT `fk_cover_letter_contents_cover_letter`
                                             FOREIGN KEY (`cover_letter_id`)
                                                 REFERENCES `cover_letter` (`id`)
                                                 ON DELETE CASCADE
                                                 ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='자기소개서 문항 및 답변';