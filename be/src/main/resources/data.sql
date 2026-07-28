-- users 테이블 더미 데이터 3개 삽입
INSERT INTO users (email, password, name, nickname)
VALUES ('hong@ssafy.com', '$2a$10$h5KFhYAebvWyXUX0ndOkEuRkuMI1gZaJX1CMo4T.RZdR2AT.7k.xu', '홍길동', '길동이'),
       ('kim@ssafy.com', '$2a$10$h5KFhYAebvWyXUX0ndOkEuRkuMI1gZaJX1CMo4T.RZdR2AT.7k.xu', '김철수', '철수야'),
       ('lee@ssafy.com', '1234', '이영희', '영희짱');

-- resume 더미데이터 3개 삽입(userid 1, 2, 3)

INSERT INTO `resumes` (
    `user_id`,
    `analysis_content`,
    `created_at`,
    `updated_at`
) VALUES (
             1,
             'Java와 Spring Boot를 중심으로 백엔드 프로젝트 경험을 보유하고 있습니다. REST API 설계, 데이터베이스 모델링, JWT 인증 구현 경험이 강점입니다.',
             '2026-07-10 13:20:00',
             '2026-07-15 18:30:00'
         );

SET @resume_user_1 = LAST_INSERT_ID();


-- 사용자 1 학력 및 교육 이수 내역
INSERT INTO `resume_trainings` (
    `resume_id`,
    `start_date`,
    `end_date`,
    `organization`,
    `course`,
    `description`
) VALUES
      (
          @resume_user_1,
          '2022-03-01',
          '2026-02-28',
          '한국대학교',
          '컴퓨터공학과',
          '자료구조, 알고리즘, 운영체제, 데이터베이스 및 웹 프로그래밍 과목을 이수했습니다.'
      ),
      (
          @resume_user_1,
          '2025-11-01',
          '2026-05-31',
          'ABC 소프트웨어 부트캠프',
          '백엔드 개발자 양성 과정',
          'Java와 Spring Boot를 활용한 웹 백엔드 실무 프로젝트를 수행했습니다.'
      );


-- 사용자 1 프로젝트 경험
INSERT INTO `resume_projects` (
    `resume_id`,
    `github_repo_id`,
    `project_name`,
    `tech_stacks`,
    `role`,
    `description`
) VALUES
      (
          @resume_user_1,
          NULL,
          '개발자 스터디 매칭 플랫폼',
          'Java, Spring Boot, JPA, MySQL, Redis',
          '백엔드 개발',
          '사용자 맞춤형 스터디 추천 기능과 스터디 그룹 관리 API를 설계하고 구현했습니다.'
      ),
      (
          @resume_user_1,
          NULL,
          '야간 관광 코스 추천 서비스',
          'Java, Spring Boot, MySQL, Redis, Docker',
          '백엔드 개발',
          '사용자 요구사항에 맞는 야간 관광 코스를 추천하고 저장하는 REST API를 구현했습니다.'
      );


-- 사용자 1 경력 사항
INSERT INTO `resume_careers` (
    `resume_id`,
    `start_date`,
    `end_date`,
    `company_name`,
    `role`,
    `description`
) VALUES
    (
        @resume_user_1,
        '2025-07-01',
        '2025-08-31',
        'ABC 소프트웨어',
        '백엔드 개발 인턴',
        '사내 관리 시스템의 사용자 조회 API와 데이터베이스 쿼리 최적화 업무를 수행했습니다.'
    );


-- =========================================================
-- 사용자 2 이력서
-- =========================================================

INSERT INTO `resumes` (
    `user_id`,
    `analysis_content`,
    `created_at`,
    `updated_at`
) VALUES (
             2,
             'React와 TypeScript 기반의 프론트엔드 개발 경험이 풍부하며, 사용자 경험을 고려한 화면 설계와 상태 관리에 강점이 있습니다.',
             '2026-07-11 10:10:00',
             '2026-07-16 09:15:00'
         );

SET @resume_user_2 = LAST_INSERT_ID();


-- 사용자 2 학력 및 교육 이수 내역
INSERT INTO `resume_trainings` (
    `resume_id`,
    `start_date`,
    `end_date`,
    `organization`,
    `course`,
    `description`
) VALUES
      (
          @resume_user_2,
          '2021-03-01',
          '2025-02-28',
          '대한대학교',
          '소프트웨어학과',
          '웹 프로그래밍, 소프트웨어 공학 및 사용자 인터페이스 설계 과목을 이수했습니다.'
      ),
      (
          @resume_user_2,
          '2025-03-01',
          '2025-08-31',
          '프론트엔드 개발 아카데미',
          'React 실무 과정',
          'React, TypeScript, 상태 관리 및 반응형 웹 개발 과정을 이수했습니다.'
      );


-- 사용자 2 프로젝트 경험
INSERT INTO `resume_projects` (
    `resume_id`,
    `github_repo_id`,
    `project_name`,
    `tech_stacks`,
    `role`,
    `description`
) VALUES
      (
          @resume_user_2,
          NULL,
          '온라인 면접 스터디 플랫폼',
          'React, TypeScript, WebRTC, WebSocket',
          '프론트엔드 개발',
          '다자간 화상 면접 화면과 실시간 채팅 인터페이스를 개발했습니다.'
      ),
      (
          @resume_user_2,
          NULL,
          '일정 관리 웹 애플리케이션',
          'React, TypeScript, Zustand, Tailwind CSS',
          '프론트엔드 개발',
          '캘린더 기반 일정 관리 화면과 사용자 상태 관리 기능을 구현했습니다.'
      );


-- 사용자 2 경력 사항
INSERT INTO `resume_careers` (
    `resume_id`,
    `start_date`,
    `end_date`,
    `company_name`,
    `role`,
    `description`
) VALUES
    (
        @resume_user_2,
        '2025-09-01',
        NULL,
        '테크 스타트업',
        '프론트엔드 인턴',
        'React 기반 관리자 페이지의 화면 개발과 공통 컴포넌트 개선 업무를 담당하고 있습니다.'
    );


-- =========================================================
-- 사용자 3 이력서
-- =========================================================

INSERT INTO `resumes` (
    `user_id`,
    `analysis_content`,
    `created_at`,
    `updated_at`
) VALUES (
             3,
             'Python 기반 AI 모델 개발과 데이터 전처리 경험을 보유하고 있으며, AI 기능을 웹 서비스와 연동한 프로젝트 경험이 있습니다.',
             '2026-07-12 14:00:00',
             '2026-07-17 20:40:00'
         );

SET @resume_user_3 = LAST_INSERT_ID();


-- 사용자 3 학력 및 교육 이수 내역
INSERT INTO `resume_trainings` (
    `resume_id`,
    `start_date`,
    `end_date`,
    `organization`,
    `course`,
    `description`
) VALUES
      (
          @resume_user_3,
          '2022-03-01',
          '2026-02-28',
          '미래대학교',
          '인공지능학과',
          '머신러닝, 딥러닝, 자연어 처리 및 컴퓨터 비전 과목을 이수했습니다.'
      ),
      (
          @resume_user_3,
          '2025-07-01',
          '2025-12-31',
          'AI 실무 교육센터',
          '생성형 AI 서비스 개발 과정',
          'LLM 활용, RAG 구성 및 FastAPI 기반 AI 서버 개발 교육을 이수했습니다.'
      );


-- 사용자 3 프로젝트 경험
INSERT INTO `resume_projects` (
    `resume_id`,
    `github_repo_id`,
    `project_name`,
    `tech_stacks`,
    `role`,
    `description`
) VALUES
      (
          @resume_user_3,
          NULL,
          'AI 모의 면접 분석 서비스',
          'Python, FastAPI, PyTorch, Hugging Face',
          'AI 개발',
          '면접 답변을 분석하여 기술 정확도와 답변 품질을 평가하는 AI 기능을 개발했습니다.'
      ),
      (
          @resume_user_3,
          NULL,
          '문서 기반 질문 생성 시스템',
          'Python, LangChain, FAISS, FastAPI',
          'AI 개발',
          '사용자가 등록한 문서를 임베딩하고 관련 내용을 검색하여 질문을 생성하는 RAG 시스템을 구현했습니다.'
      );


-- 사용자 3 경력 사항
INSERT INTO `resume_careers` (
    `resume_id`,
    `start_date`,
    `end_date`,
    `company_name`,
    `role`,
    `description`
) VALUES
    (
        @resume_user_3,
        '2025-01-01',
        '2025-06-30',
        '미래대학교 AI 연구실',
        '학부 연구생',
        '추천 시스템 관련 데이터 전처리와 모델 성능 평가 실험을 수행했습니다.'
    );

-- 자기소개서 더미데이터 4개 추가
-- userId는 1로 고정

-- 1. 삼성전자 자기소개서
INSERT INTO cover_letter (
    user_id,
    title,
    company_name,
    role,
    analysis_content,
    created_at,
    updated_at
) VALUES (
             1,
             '삼성전자 DX 부문 자기소개서',
             '삼성전자',
             '백엔드 개발자',
             '지원자의 프로젝트 경험과 문제 해결 역량이 잘 드러납니다. 다만 지원 동기에서 삼성전자와 직무의 연관성을 조금 더 구체적으로 작성할 필요가 있습니다.',
             NOW(),
             NOW()
         );

SET @cover_letter_id_1 = LAST_INSERT_ID();

INSERT INTO cover_letter_contents (
    cover_letter_id,
    content_order,
    question,
    answer
) VALUES
      (
          @cover_letter_id_1,
          1,
          '삼성전자를 지원한 이유와 입사 후 이루고 싶은 꿈을 기술하십시오.',
          '저는 안정적이고 확장 가능한 백엔드 시스템을 개발하여 사용자에게 신뢰할 수 있는 서비스를 제공하고 싶어 삼성전자에 지원했습니다. 프로젝트에서 Spring Boot와 MySQL을 활용해 REST API를 개발한 경험을 바탕으로 DX 부문의 서비스 품질 향상에 기여하겠습니다.'
      ),
      (
          @cover_letter_id_1,
          2,
          '본인의 성장 과정을 간략히 기술하되 현재의 자신에게 가장 큰 영향을 끼친 사건을 포함하여 기술하십시오.',
          '대학교 팀 프로젝트에서 백엔드 개발을 담당하며 협업의 중요성을 배웠습니다. 초기에는 각자 맡은 기능만 구현했지만 API 명세가 일치하지 않아 문제가 발생했습니다. 이후 팀원들과 명세를 표준화하고 정기적인 코드 리뷰를 진행하면서 협업 역량을 키웠습니다.'
      );


-- 2. 카카오 자기소개서
INSERT INTO cover_letter (
    user_id,
    title,
    company_name,
    role,
    analysis_content,
    created_at,
    updated_at
) VALUES (
             1,
             '카카오 백엔드 개발자 자기소개서',
             '카카오',
             '서버 개발자',
             '기술적인 경험은 구체적으로 작성되어 있으나 서비스 관점에서 어떤 가치를 만들었는지에 대한 설명을 보완하면 좋습니다.',
             NOW(),
             NOW()
         );

SET @cover_letter_id_2 = LAST_INSERT_ID();

INSERT INTO cover_letter_contents (
    cover_letter_id,
    content_order,
    question,
    answer
) VALUES
      (
          @cover_letter_id_2,
          1,
          '카카오에 지원한 동기와 입사 후 목표를 작성해 주세요.',
          '카카오는 다양한 서비스를 통해 많은 사용자의 일상에 직접적인 가치를 제공하고 있습니다. 저는 대규모 트래픽에도 안정적으로 동작하는 서버를 개발하며 사용자 경험 향상에 기여하고 싶어 지원했습니다.'
      ),
      (
          @cover_letter_id_2,
          2,
          '기술적으로 어려운 문제를 해결했던 경험을 작성해 주세요.',
          '여행 경로 추천 프로젝트에서 외부 API 호출 증가로 응답 시간이 길어지는 문제가 발생했습니다. 호출 결과를 캐싱하고 후보 경로를 먼저 필터링한 후 외부 API를 호출하도록 개선하여 평균 응답 시간을 줄였습니다.'
      );


-- 3. 네이버 자기소개서
INSERT INTO cover_letter (
    user_id,
    title,
    company_name,
    role,
    analysis_content,
    created_at,
    updated_at
) VALUES (
             1,
             '네이버 신입 개발자 자기소개서',
             '네이버',
             '백엔드 개발자',
             '문제 해결 과정과 기술 선택 이유가 비교적 명확합니다. 성과를 수치로 표현하면 더욱 설득력 있는 자기소개서가 될 수 있습니다.',
             NOW(),
             NOW()
         );

SET @cover_letter_id_3 = LAST_INSERT_ID();

INSERT INTO cover_letter_contents (
    cover_letter_id,
    content_order,
    question,
    answer
) VALUES
      (
          @cover_letter_id_3,
          1,
          '본인이 가장 열정적으로 수행했던 프로젝트를 소개해 주세요.',
          'AI 모의 면접 플랫폼 프로젝트에서 백엔드 개발을 담당했습니다. 사용자 인증, 자기소개서 관리, 면접 질문 생성 기능을 구현했으며 Spring Boot, JPA, MySQL, Redis를 사용해 시스템을 구성했습니다.'
      ),
      (
          @cover_letter_id_3,
          2,
          '협업 과정에서 발생한 갈등과 해결 과정을 작성해 주세요.',
          'API 응답 형식을 두고 프론트엔드 개발자와 의견 차이가 있었습니다. 각 방식의 장단점을 정리하고 실제 사용 시나리오를 기준으로 논의하여 공통 응답 형식을 결정했습니다. 이후 API 명세서를 최신 상태로 관리하여 추가적인 혼선을 줄였습니다.'
      );


-- 4. 토스 자기소개서
INSERT INTO cover_letter (
    user_id,
    title,
    company_name,
    role,
    analysis_content,
    created_at,
    updated_at
) VALUES (
             1,
             '토스 서버 개발자 자기소개서',
             '비바리퍼블리카',
             'Server Developer',
             NULL,
             NOW(),
             NOW()
         );

SET @cover_letter_id_4 = LAST_INSERT_ID();

INSERT INTO cover_letter_contents (
    cover_letter_id,
    content_order,
    question,
    answer
) VALUES
      (
          @cover_letter_id_4,
          1,
          '토스에 지원한 이유를 작성해 주세요.',
          '토스가 복잡한 금융 서비스를 사용자가 쉽게 이용할 수 있도록 개선해 온 과정에 관심을 가지고 있습니다. 저도 기술을 통해 복잡한 문제를 단순하게 해결하고 사용자에게 편리한 경험을 제공하는 개발자가 되고 싶습니다.'
      ),
      (
          @cover_letter_id_4,
          2,
          '빠르게 학습하여 문제를 해결한 경험을 작성해 주세요.',
          '프로젝트에서 처음으로 Redis를 사용해야 했습니다. 공식 문서와 예제 코드를 통해 자료구조와 만료 정책을 학습한 뒤 리프레시 토큰 저장과 실시간 접속 상태 관리 기능에 적용했습니다.'
      );

-- =========================================================
-- 1. GitHub App 연동 정보 (user_id = 1)
-- =========================================================
INSERT INTO github_apps (id, user_id, installation_id, github_username, created_at)
VALUES (1, 1, '12345678', 'hong-gildong', NOW());


-- =========================================================
-- 2. GitHub 레포지토리 정보 (github_app_id = 1 기준 3개)
-- =========================================================
INSERT INTO github_repos (
    github_app_id,
    repo_id,
    repo_name,
    repo_nickname,
    analysis_content,
    is_private,
    created_at
)
VALUES
    (
        1,
        101,
        'Ait-backend',
        'Ait 서비스 백엔드 메인 프로젝트',
        'Spring Boot 기반 RESTful API 구현 및 JPA/MySQL 연동 완료. OAuth2 및 JWT 기반 인증 구조 설계.',
        FALSE,
        NOW()
    ),
    (
        1,
        102,
        'algorithm-study',
        '알고리즘 및 코딩테스트 대비',
        '주요 자료구조(스택, 큐, 해시) 및 DP, DFS/BFS 알고리즘 문제 풀이 모음.',
        FALSE,
        NOW()
    ),
    (
        1,
        103,
        'fastapi-ai-service',
        'AI 모의면접 피드백 서비스',
        'FastAPI 및 LLM 프롬프트 연동을 통한 면접 질문/피드백 비동기 생성 파이프라인 구축.',
        TRUE,
        NOW()
    );

-- =========================================================
-- 사용자 보유 스킬 (user_id = 1 기준 3개)
-- =========================================================
INSERT INTO user_skills (user_id, skill)
VALUES
    (1, 'Java'),
    (1, 'Spring Boot'),
    (1, 'MySQL');


-- =========================================================
-- 5. STUDY GROUPS & MEMBERS, CALENDARS, CHATS
-- =========================================================

-- 스터디 그룹 등록 (총 3개)
INSERT INTO `study_groups` (`id`, `owner_id`, `title`, `description`, `capacity`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, '백엔드/스프링 면접 스터디', 'CS 및 Spring Boot 심층 면접 대비 스터디입니다. 매주 화요일 진행.', 6, 'ACTIVE', '2026-07-01 10:00:00', NOW()),
(2, 2, '1일 1알고리즘 문제풀이반', '하루 한 문제 알고리즘 풀이 및 코드 리뷰 진행합니다. (Java/Python)', 4, 'RECRUITING', '2026-07-10 14:30:00', NOW()),
(3, 3, 'AIT 프로젝트 모의 면접', '프로젝트 경험 기반 모의 면접 및 상호 피드백 진행하실 분!', 4, 'ACTIVE', '2026-07-20 09:00:00', NOW());

-- 스터디 멤버 등록
INSERT INTO `study_group_members` (`group_id`, `user_id`, `role`, `message`, `status`, `joined_at`, `created_at`, `updated_at`) VALUES
-- 1번 그룹
(1, 1, 'OWNER', '방장입니다.', 'ACTIVE', '2026-07-01 10:00:00', '2026-07-01 10:00:00', NOW()),
(1, 2, 'MEMBER', '열심히 하겠습니다!', 'ACTIVE', '2026-07-02 11:20:00', '2026-07-02 11:00:00', NOW()),

-- 2번 그룹
(2, 2, 'OWNER', '방장입니다.', 'ACTIVE', '2026-07-10 14:30:00', '2026-07-10 14:30:00', NOW()),
(2, 1, 'MEMBER', 'DP 부분이 약해서 참여하고 싶습니다. 잘 부탁드려요!', 'ACTIVE', '2026-07-03 15:10:00', '2026-07-24 20:00:00', NOW()),

-- 3번 그룹
(3, 3, 'OWNER', '방장입니다.', 'ACTIVE', '2026-07-20 09:00:00', '2026-07-20 09:00:00', NOW()),
(3, 1, 'MEMBER', '프로젝트 아키텍처 위주로 리뷰받고 싶어요.', 'ACTIVE', '2026-07-21 13:00:00', '2026-07-21 12:30:00', NOW());

-- 스터디 캘린더
INSERT INTO `study_group_calendars` (`group_id`, `content`, `start_time`) VALUES
(1, '6월 샘플', '2026-06-15 20:00:00'),
(1, '1주차: Java & Spring 기초 면접', '2026-07-15 20:00:00'),
(1, '2주차: DB & JPA 심화 면접', '2026-07-22 20:00:00'),
(2, '알고리즘 DP/DFS 풀이 세션', '2026-07-26 19:00:00'),
(3, '이력서 기반 모의 면접 1회차', '2026-07-27 21:00:00');

-- 스터디 채팅
INSERT INTO `study_group_chats` (`group_id`, `user_id`, `message`, `created_at`) VALUES
(1, 1, '안녕하세요! 스터디원 모집 완료되었습니다.', '2026-07-04 10:00:00'),
(1, 2, '반갑습니다 ㅎㅎ 앞으로 잘 부탁드려요!', '2026-07-04 10:05:00'),
(1, 3, '네 다들 화이팅입니다. 이번 주 첫 세션 주제는 뭔가요?', '2026-07-04 10:30:00'),
(1, 1, '이번 주는 공지사항 캘린더에 올려둔 것처럼 Java 위주로 갑니다.', '2026-07-04 10:35:00'),
(3, 3, '다들 주말 잘 보내고 계신가요? 월요일 모의 면접 준비 화이팅입니다!', '2026-07-25 18:00:00'),
(3, 1, '확인했습니다! 내일 뵙겠습니다.', '2026-07-25 18:10:00');