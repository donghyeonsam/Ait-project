-- =========================================================
-- 외래키 관계를 고려한 테이블 삭제
-- 자식 테이블부터 부모 테이블 순서로 삭제
-- =========================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `peer_feedbacks`;
DROP TABLE IF EXISTS `ai_peer_summaries`;
DROP TABLE IF EXISTS `study_sessions`;
DROP TABLE IF EXISTS `study_group_members`;
DROP TABLE IF EXISTS `study_group_chat_reactions`;
DROP TABLE IF EXISTS `study_group_chats`;
DROP TABLE IF EXISTS `study_group_calendars`;
DROP TABLE IF EXISTS `study_groups`;
DROP TABLE IF EXISTS `ai_comprehensive_reports`;
DROP TABLE IF EXISTS `ai_interview_questions`;
DROP TABLE IF EXISTS `ai_interviews`;
DROP TABLE IF EXISTS `cover_letter_contents`;
DROP TABLE IF EXISTS `cover_letter`;
DROP TABLE IF EXISTS `resume_projects`;
DROP TABLE IF EXISTS `resume_trainings`;
DROP TABLE IF EXISTS `resume_careers`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `github_repos`;
DROP TABLE IF EXISTS `github_apps`;
DROP TABLE IF EXISTS `resumes`;
DROP TABLE IF EXISTS `user_skills`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `study_session_participants`;

SET FOREIGN_KEY_CHECKS = 1;

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
                         UNIQUE KEY `uk_users_email` (`email`),
                         UNIQUE KEY `uk_users_nickname` (`nickname`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='사용자 정보';

CREATE TABLE `user_skills` (
                               `id` BIGINT NOT NULL AUTO_INCREMENT,
                               `user_id` BIGINT NOT NULL,
                               `skill` VARCHAR(20) NOT NULL,

                               PRIMARY KEY (`id`),

    -- 동일 사용자가 중복된 스킬을 등록하는 것을 방지
                               UNIQUE KEY `uk_user_skills_user_skill` (`user_id`, `skill`),

                               KEY `idx_user_skills_user_id` (`user_id`),

                               CONSTRAINT `fk_user_skills_user`
                                   FOREIGN KEY (`user_id`)
                                       REFERENCES `users` (`id`)
                                       ON DELETE CASCADE
                                       ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='사용자의 보유 스킬';

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
                           `analysis_content` MEDIUMTEXT DEFAULT NULL,
                           `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           `updated_at` DATETIME DEFAULT NULL,
                           `deleted_at` DATETIME DEFAULT NULL,

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
                                `analysis_content` MEDIUMTEXT DEFAULT NULL,
                                `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

CREATE TABLE `ai_interviews` (
                                 `id` BIGINT NOT NULL AUTO_INCREMENT,
                                 `user_id` BIGINT NOT NULL,
                                 `interview_type` VARCHAR(30) NOT NULL,
                                 `difficulty` VARCHAR(30) NOT NULL,
                                 `ai_attitude_style` VARCHAR(30) NOT NULL,
                                 `status` VARCHAR(30) NOT NULL,
                                 `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 `ended_at` DATETIME DEFAULT NULL,

                                 PRIMARY KEY (`id`),

                                 KEY `idx_ai_interviews_user_id` (`user_id`),

                                 CONSTRAINT `fk_ai_interviews_user`
                                     FOREIGN KEY (`user_id`)
                                         REFERENCES `users` (`id`)
                                         ON DELETE CASCADE
                                         ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='AI 모의 면접 기본 정보';

CREATE TABLE `ai_interview_questions` (
                                          `id` BIGINT NOT NULL AUTO_INCREMENT,
                                          `ai_interview_id` BIGINT NOT NULL,
                                          `question` TEXT NOT NULL,
                                          `user_answer` TEXT DEFAULT NULL,
                                          `ai_answer` TEXT DEFAULT NULL,
                                          `feedback` TEXT DEFAULT NULL,

                                          PRIMARY KEY (`id`),

    -- 조회 성능 향상을 위한 외래키 인덱스
                                          KEY `idx_ai_interview_questions_ai_interview_id` (`ai_interview_id`),

    -- ai_interviews 테이블 삭제 시 질문 및 답변도 자동 삭제 처리
                                          CONSTRAINT `fk_ai_interview_questions_ai_interview`
                                              FOREIGN KEY (`ai_interview_id`)
                                                  REFERENCES `ai_interviews` (`id`)
                                                  ON DELETE CASCADE
                                                  ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='AI 모의 면접 질문 및 사용자 답변';

CREATE TABLE `ai_comprehensive_reports` (
                                            `id` BIGINT NOT NULL AUTO_INCREMENT,
                                            `ai_interview_id` BIGINT NOT NULL,
                                            `content` TEXT NOT NULL,
                                            `eye_contact_score` INT NOT NULL,
                                            `face_score` INT NOT NULL,
                                            `voice_score` INT NOT NULL,
                                            `qna_score` INT NOT NULL,
                                            `sentence_score` INT NOT NULL,
                                            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                            PRIMARY KEY (`id`),

    -- 1:1 관계 또는 면접 ID 기반 빠른 조회를 위한 외래키 인덱스
                                            KEY `idx_ai_comprehensive_reports_ai_interview_id` (`ai_interview_id`),

    -- ai_interviews 테이블 삭제 시 종합 평가 리포트도 자동 삭제 처리
                                            CONSTRAINT `fk_ai_comprehensive_reports_ai_interview`
                                                FOREIGN KEY (`ai_interview_id`)
                                                    REFERENCES `ai_interviews` (`id`)
                                                    ON DELETE CASCADE
                                                    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='AI 최종 평가 리포트';





-- =========================================================
-- 1. 스터디 그룹
-- =========================================================
-- 임시 스터디 그룹 테이블
CREATE TABLE study_groups (
                              id BIGINT NOT NULL AUTO_INCREMENT,
                              owner_id BIGINT NOT NULL,

                              title VARCHAR(50) NOT NULL,
                              description TEXT NOT NULL,

                              status VARCHAR(20) NOT NULL DEFAULT 'RECRUITING',
                              chat_notice VARCHAR(255) NULL,
                              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                              deleted_at DATETIME NULL,

                              PRIMARY KEY (id),

                              KEY idx_study_groups_owner_id (owner_id),
                              KEY idx_study_groups_status_deleted_at (status, deleted_at),

                              CONSTRAINT fk_study_groups_owner
                                  FOREIGN KEY (owner_id)
                                    REFERENCES users(id)
);


-- =========================================================
-- 2. 스터디 그룹 캘린더
-- =========================================================
CREATE TABLE `study_group_calendars` (
                                         `id` BIGINT NOT NULL AUTO_INCREMENT,
                                         `group_id` BIGINT NOT NULL,
                                         `content` VARCHAR(255) NOT NULL,
                                         `start_time` DATETIME NOT NULL,
                                         created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                         updated_at DATETIME NOT NULL
                                                DEFAULT CURRENT_TIMESTAMP
                                                ON UPDATE CURRENT_TIMESTAMP,
                                         deleted_at DATETIME NULL,
                                         PRIMARY KEY (`id`),

                                         KEY `idx_study_group_calendars_group_id` (`group_id`),

                                         CONSTRAINT `fk_study_group_calendars_group`
                                             FOREIGN KEY (`group_id`)
                                                 REFERENCES `study_groups` (`id`)
                                                 ON DELETE CASCADE
                                                 ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='스터디 그룹에 포함되는 캘린더';

-- =========================================================
-- 3. 스터디 그룹 채팅
-- =========================================================
CREATE TABLE `study_group_chats` (
                                     `id` BIGINT NOT NULL AUTO_INCREMENT,
                                     `group_id` BIGINT NOT NULL,
                                     `user_id` BIGINT NOT NULL,
                                     `message` VARCHAR(255) NOT NULL,
                                     `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                     PRIMARY KEY (`id`),

                                     KEY `idx_study_group_chats_group_id` (`group_id`),
                                     KEY `idx_study_group_chats_user_id` (`user_id`),

                                     CONSTRAINT `fk_study_group_chats_group`
                                         FOREIGN KEY (`group_id`)
                                             REFERENCES `study_groups` (`id`)
                                             ON DELETE CASCADE
                                             ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='스터디 그룹에 포함되는 채팅';

CREATE TABLE `study_group_chat_reactions` (
                                              `id` BIGINT NOT NULL AUTO_INCREMENT,
                                              `chat_id` BIGINT NOT NULL,
                                              `user_id` BIGINT NOT NULL,
                                              `emoji` VARCHAR(32) NOT NULL,
                                              `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                              PRIMARY KEY (`id`),

                                              UNIQUE KEY `uk_study_group_chat_reactions_chat_user_emoji`
                                                  (`chat_id`, `user_id`, `emoji`),
                                              KEY `idx_study_group_chat_reactions_chat_id` (`chat_id`),
                                              KEY `idx_study_group_chat_reactions_user_id` (`user_id`),

                                              CONSTRAINT `fk_study_group_chat_reactions_chat`
                                                  FOREIGN KEY (`chat_id`)
                                                      REFERENCES `study_group_chats` (`id`)
                                                      ON DELETE CASCADE,
                                              CONSTRAINT `fk_study_group_chat_reactions_user`
                                                  FOREIGN KEY (`user_id`)
                                                      REFERENCES `users` (`id`)
                                                      ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='스터디 그룹 채팅 이모지 반응';

-- =========================================================
-- 4. 스터디 그룹 멤버
-- =========================================================

-- 임시 스터디 그룹 멤버 테이블
CREATE TABLE study_group_members (
                                     id BIGINT NOT NULL AUTO_INCREMENT,
                                     group_id BIGINT NOT NULL,
                                     user_id BIGINT NOT NULL,
                                     `message` VARCHAR(255) NOT NULL,

                                     role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
                                     status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

                                     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                     updated_at DATETIME NOT NULL
                                         DEFAULT CURRENT_TIMESTAMP
                                         ON UPDATE CURRENT_TIMESTAMP,
                                     deleted_at DATETIME NULL,

                                     PRIMARY KEY (id),

                                     UNIQUE KEY uk_study_group_members_group_user (
                                         group_id,
                                         user_id
                                         ),

                                     KEY idx_study_group_members_group_status (
        group_id,
        status
    ),

                                     KEY idx_study_group_members_user_id (
        user_id
    ),

                                     CONSTRAINT fk_study_group_members_group
                                         FOREIGN KEY (group_id)
                                             REFERENCES study_groups(id)
                                             ON DELETE CASCADE,

                                     CONSTRAINT fk_study_group_members_user
                                         FOREIGN KEY (user_id)
                                             REFERENCES users(id)
);


-- =========================================================
-- 5. 스터디 그룹 세션
-- =========================================================
CREATE TABLE study_sessions (
                                id BIGINT NOT NULL AUTO_INCREMENT,
                                group_id BIGINT NOT NULL,

                                livekit_room_name VARCHAR(100) NOT NULL,

                                status VARCHAR(20) NOT NULL DEFAULT 'WAITING',
                                max_participants INT NOT NULL DEFAULT 8,

                                started_at DATETIME NULL,
                                ended_at DATETIME NULL,

                                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                updated_at DATETIME NOT NULL
                                    DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,

                                PRIMARY KEY (id),

                                UNIQUE KEY uk_study_sessions_livekit_room_name (
                                    livekit_room_name
                                    ),

                                KEY idx_study_sessions_group_id (
        group_id
    ),

                                KEY idx_study_sessions_group_status (
        group_id,
        status
    ),

                                CONSTRAINT fk_study_sessions_group
                                    FOREIGN KEY (group_id)
                                        REFERENCES study_groups(id)
                                        ON DELETE CASCADE,

                                CONSTRAINT chk_study_sessions_max_participants
                                    CHECK (
                                        max_participants >= 1
                                            AND max_participants <= 8
                                        )
);

-- =========================================================
-- 6. 스터디 그룹 세션 참여자 관리
-- =========================================================
CREATE TABLE study_session_participants (
                                            id BIGINT NOT NULL AUTO_INCREMENT,

                                            session_id BIGINT NOT NULL,
                                            user_id BIGINT NOT NULL,
                                            resume_id BIGINT NULL,
                                            cover_letter_id BIGINT NULL,

                                            role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
                                            status VARCHAR(20) NOT NULL DEFAULT 'JOINED',

                                            first_joined_at DATETIME NULL,
                                            last_left_at DATETIME NULL,

                                            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                            updated_at DATETIME NOT NULL
                                                DEFAULT CURRENT_TIMESTAMP
                                                ON UPDATE CURRENT_TIMESTAMP,

                                            PRIMARY KEY (id),

                                            UNIQUE KEY uk_study_session_participant (
                                                session_id,
                                                user_id
                                                ),

                                            KEY idx_study_session_participants_session_id (
        session_id
    ),

                                            KEY idx_study_session_participants_user_id (
        user_id
    ),

                                            KEY idx_study_session_participants_session_status (
        session_id,
        status
    ),

                                            CONSTRAINT fk_study_session_participants_session
                                                FOREIGN KEY (session_id)
                                                    REFERENCES study_sessions(id)
                                                    ON DELETE CASCADE,

                                            CONSTRAINT fk_study_session_participants_user
                                                FOREIGN KEY (user_id)
                                                    REFERENCES users(id)
                                                    ON DELETE CASCADE
);

-- =========================================================
-- 6. 상호평가 AI 요약
-- =========================================================
CREATE TABLE `ai_peer_summaries` (
                                     `id` BIGINT NOT NULL AUTO_INCREMENT,
                                     `session_id` BIGINT NOT NULL,
                                     `evaluatee_id` BIGINT NOT NULL,
                                     `content` TEXT NOT NULL,
                                     `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                     PRIMARY KEY (`id`),

                                     KEY `idx_ai_peer_summaries_session_id` (`session_id`),
                                     KEY `idx_ai_peer_summaries_evaluatee_id` (`evaluatee_id`),

                                     CONSTRAINT `fk_ai_peer_summaries_session`
                                         FOREIGN KEY (`session_id`)
                                             REFERENCES `study_sessions` (`id`)
                                             ON DELETE CASCADE
                                             ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='상호평가의 AI 요약';

-- =========================================================
-- 7. 상호평가 피드백
-- =========================================================
CREATE TABLE `peer_feedbacks` (
                                  `id` BIGINT NOT NULL AUTO_INCREMENT,
                                  `session_id` BIGINT NOT NULL,
                                  `evaluator_id` BIGINT NOT NULL,
                                  `evaluatee_id` BIGINT NOT NULL,
                                  `logical_score` INT NOT NULL,
                                  `answer_score` INT NOT NULL,
                                  `communication_score` INT NOT NULL,
                                  `comprehension_score` INT NOT NULL,
                                  `attitude_score` INT NOT NULL,
                                  `time_management_score` INT NOT NULL,
                                  `feedback` TEXT NOT NULL,
                                  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                  PRIMARY KEY (`id`),

                                  KEY `idx_peer_feedbacks_session_id` (`session_id`),
                                  KEY `idx_peer_feedbacks_evaluator_id` (`evaluator_id`),
                                  KEY `idx_peer_feedbacks_evaluatee_id` (`evaluatee_id`),

                                  CONSTRAINT `fk_peer_feedbacks_session`
                                      FOREIGN KEY (`session_id`)
                                          REFERENCES `study_sessions` (`id`)
                                          ON DELETE CASCADE
                                          ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='상호평가 기록';
