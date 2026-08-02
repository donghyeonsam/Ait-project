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
INSERT INTO `study_groups` (`id`, `owner_id`, `title`, `description`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, '백엔드/스프링 면접 스터디', 'CS 및 Spring Boot 심층 면접 대비 스터디입니다. 매주 화요일 진행.',  'ACTIVE', '2026-07-01 10:00:00', NOW()),
(2, 2, '1일 1알고리즘 문제풀이반', '하루 한 문제 알고리즘 풀이 및 코드 리뷰 진행합니다. (Java/Python)',  'RECRUITING', '2026-07-10 14:30:00', NOW()),
(3, 3, 'AIT 프로젝트 모의 면접', '프로젝트 경험 기반 모의 면접 및 상호 피드백 진행하실 분!',  'ACTIVE', '2026-07-20 09:00:00', NOW());

-- 스터디 멤버 등록
INSERT INTO `study_group_members` (
    `group_id`, `user_id`, `role`, `message`, `status`, `created_at`, `updated_at`
) VALUES
-- 1번 그룹
(1, 1, 'OWNER', '방장입니다.', 'ACTIVE', '2026-07-01 10:00:00', NOW()),
(1, 2, 'MEMBER', '열심히 하겠습니다!', 'ACTIVE', '2026-07-02 11:00:00', NOW()),

-- 2번 그룹
(2, 2, 'OWNER', '방장입니다.', 'ACTIVE', '2026-07-10 14:30:00', NOW()),
(2, 1, 'MEMBER', 'DP 부분이 약해서 참여하고 싶습니다. 잘 부탁드려요!', 'ACTIVE', '2026-07-24 20:00:00', NOW()),

-- 3번 그룹
(3, 3, 'OWNER', '방장입니다.', 'ACTIVE', '2026-07-20 09:00:00', NOW()),
(3, 1, 'MEMBER', '프로젝트 아키텍처 위주로 리뷰받고 싶어요.', 'ACTIVE', '2026-07-21 12:30:00', NOW());

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


-- ai_interviews 더미 2건 (user_id = 1)
-- 💡 이전 백엔드 코드에서 "doing" -> "done"으로 상태를 업데이트했으므로,
-- 상태값을 'COMPLETED' 대신 'done'으로 통일하는 것을 추천합니다. (물론 설계하신 Enum에 맞춰 변경하셔도 됩니다!)
INSERT INTO ai_interviews
(user_id, interview_type, difficulty, ai_attitude_style, status, created_at, ended_at)
VALUES
    (1, '기술 면접', '어려움', 'FRIENDLY', 'done', '2026-07-28 14:30:00', '2026-07-28 15:05:00'),
    (1, '포폴 면접', '보통', 'STRICT', 'done', '2026-07-30 10:00:00', '2026-07-30 10:40:00');


-- ai_comprehensive_reports 더미 2건 (위 면접 각각에 1개씩)
-- ⚠️ ai_interview_id 는 위 INSERT 로 생성된 실제 id 값에 맞춰야 합니다.
-- ⚠️ content 부분에 완벽한 JSON 포맷을 문자열로 삽입했습니다.
INSERT INTO ai_comprehensive_reports
(ai_interview_id, content, eye_contact_score, face_score, voice_score, qna_score, sentence_score, created_at)
VALUES
    (
        1,
        '{
          "strengths": [
            "자료구조와 알고리즘에 대한 깊은 이해도를 바탕으로 기술 질문에 막힘없이 답변했습니다.",
            "결론을 먼저 말하고 근거를 제시하는 두괄식 말하기 습관이 아주 훌륭합니다."
          ],
          "weaknesses": [
            "답변 중간에 시선이 위로 향하는 경우가 잦아 다소 자신감이 부족해 보일 수 있습니다.",
            "특정 기술 스택을 설명할 때 불필요한 영어 습관어가 혼재되어 문장 전달력이 조금 아쉽습니다."
          ]
        }',
        88.50, 82.00, 90.25, 85.75, 87.00, '2026-07-28 15:06:00'
    ),
    (
        2,
        '{
          "strengths": [
            "프로젝트에서 본인이 기여한 바와 트러블 슈팅 과정을 논리적으로 잘 설명했습니다.",
            "예상치 못한 압박 질문에도 당황하지 않고 침착하게 목소리 톤을 유지한 점이 돋보입니다."
          ],
          "weaknesses": [
            "면접관(카메라)을 응시하지 않고 화면 아래쪽을 자주 보는 등 시선 처리가 다소 불안정합니다.",
            "답변의 길이가 너무 길어 핵심이 흐려지는 경향이 있습니다. 간결하게 요약하는 연습이 필요합니다."
          ]
        }',
        72.25, 75.50, 80.00, 88.00, 85.50, '2026-07-30 10:41:00'
    );

-- ai_interview_questions 더미 7건 (ai_interview_id = 1)
INSERT INTO ai_interview_questions
(ai_interview_id, question, user_answer, ai_answer, feedback)
VALUES
    (1,
     '자기소개를 간단히 해주세요.',
     '안녕하세요. 백엔드 개발자를 지망하는 지원자입니다. Spring Boot로 프로젝트를 몇 개 해봤습니다.',
     '안녕하세요. 사용자 경험을 개선하는 백엔드 개발자를 지망하는 OOO입니다. Spring Boot 기반으로 커머스 주문 시스템과 실시간 채팅 서비스를 개발했고, 특히 트래픽이 몰리는 상황에서의 성능 개선에 관심이 많습니다.',
     '핵심 기술 스택을 언급하신 점이 좋았습니다. 다만 "프로젝트를 몇 개 해봤다"처럼 모호하게 말하기보다, 대표 프로젝트 한두 개를 구체적으로 짚어 어떤 역할을 했는지 덧붙이면 훨씬 설득력이 생깁니다.'),

    (1,
     'RESTful API를 설계할 때 가장 중요하게 생각하는 원칙은 무엇인가요?',
     '자원을 URL로 표현하고 HTTP 메서드로 행위를 구분하는 것이 중요하다고 생각합니다.',
     '자원(Resource)을 명사 중심의 URI로 표현하고, 행위는 GET/POST/PUT/DELETE 같은 HTTP 메서드로 구분하는 것을 가장 중요하게 봅니다. 또한 상태 코드를 의미에 맞게 사용하고, 응답에 일관된 형식을 유지하며, 무상태(stateless) 원칙을 지키는 것도 중요합니다.',
     '자원과 메서드 구분이라는 핵심을 정확히 짚으셨습니다. 여기에 상태 코드 활용이나 무상태성 같은 원칙을 한두 가지 더 얹으면 이해의 깊이를 훨씬 잘 보여줄 수 있습니다.'),

    (1,
     'JPA에서 N+1 문제가 무엇이고, 어떻게 해결할 수 있나요?',
     '연관된 엔티티를 조회할 때 쿼리가 많이 나가는 문제입니다. fetch join으로 해결합니다.',
     'N+1 문제는 연관 엔티티를 지연 로딩할 때, 부모를 조회하는 1번의 쿼리 이후 각 자식마다 추가 쿼리가 N번 발생하는 현상입니다. 해결책으로는 fetch join, @EntityGraph, 배치 사이즈(hibernate.default_batch_fetch_size) 설정 등이 있으며, 상황에 따라 적절한 방법을 선택합니다.',
     '문제의 본질과 fetch join이라는 대표 해법을 정확히 알고 계신 점이 인상적입니다. @EntityGraph나 batch size처럼 대안이 여럿 있다는 것까지 언급하면 "왜 그 방법을 골랐는지"를 설명할 수 있어 더 좋습니다.'),

    (1,
     '트랜잭션의 격리 수준(Isolation Level)에 대해 설명해주세요.',
     '음... READ COMMITTED 같은 게 있는데 정확히는 잘 기억이 안 납니다.',
     '트랜잭션 격리 수준은 동시에 실행되는 트랜잭션끼리 서로의 데이터에 얼마나 영향을 받는지를 정하는 단계입니다. READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE 네 단계가 있고, 단계가 높아질수록 정합성은 좋아지지만 동시성은 떨어집니다. 각 단계에서 Dirty Read, Non-Repeatable Read, Phantom Read가 어떻게 발생하는지로 구분합니다.',
     '솔직하게 모른다고 말씀하신 태도 자체는 나쁘지 않습니다. 다만 이 질문은 자주 나오는 기본 개념이니, 네 가지 단계와 각 단계에서 막아주는 이상 현상(Dirty/Non-Repeatable/Phantom Read)을 짝지어 정리해두면 좋겠습니다.'),

    (1,
     '동시성 이슈를 처리해본 경험이 있다면 말씀해주세요.',
     '재고 차감 로직에서 동시 요청이 들어오면 재고가 음수가 되는 문제가 있어서, 비관적 락으로 해결했습니다.',
     '커머스 프로젝트의 재고 차감 로직에서, 동시 주문 요청이 몰릴 때 재고가 음수로 내려가는 문제를 겪었습니다. 처음에는 비관적 락(Pessimistic Lock)으로 해결했고, 이후 락으로 인한 성능 저하를 개선하기 위해 재고성 데이터를 Redis로 옮겨 원자적 연산으로 처리하는 방식도 검토했습니다.',
     '실제 문제 상황과 해결책(비관적 락)을 구체적으로 제시하신 점이 아주 좋았습니다. 여기에 "그 방법의 트레이드오프는 무엇이었고, 개선 여지는 없었는지"까지 덧붙이면 문제 해결의 깊이가 돋보입니다.'),

    (1,
     '코드 리뷰를 할 때 어떤 점을 중점적으로 보나요?',
     '가독성이랑 버그가 없는지 봅니다.',
     '가독성과 잠재적 버그를 우선적으로 봅니다. 구체적으로는 네이밍이 의도를 잘 드러내는지, 함수의 책임이 단일한지, 예외 상황과 경계값 처리가 빠지지 않았는지, 그리고 테스트 코드가 핵심 로직을 충분히 검증하는지를 확인합니다.',
     '중요한 두 축(가독성, 버그)을 짚으신 건 좋습니다. 다만 답변이 다소 짧으니, 각 항목을 "어떤 기준으로" 보는지 예시를 붙이면 리뷰 경험이 있다는 인상을 더 강하게 줄 수 있습니다.'),

    (1,
     '마지막으로 입사 후 이루고 싶은 목표가 있다면요?',
     '좋은 개발자가 되고 싶고 서비스 성장에 기여하고 싶습니다.',
     '단기적으로는 팀의 코드베이스와 도메인을 빠르게 익혀 온전한 몫을 해내는 것이 목표입니다. 중장기적으로는 성능과 안정성 관점에서 서비스 개선을 주도하고, 제가 배운 것을 팀과 공유하며 함께 성장하는 개발자가 되고 싶습니다.',
     '성장 의지와 기여 의사를 밝히신 점은 좋습니다. 다만 "좋은 개발자"라는 표현이 다소 추상적이니, 단기·중장기로 나눠 구체적인 목표를 제시하면 진정성이 훨씬 잘 전달됩니다.');

-- ai_interview_questions 더미 7건 (ai_interview_id = 2, 포폴 면접)
INSERT INTO ai_interview_questions
(ai_interview_id, question, user_answer, ai_answer, feedback)
VALUES
    (2,
     '제출해주신 이력서를 보면 실시간 경매 시스템을 개발하셨는데, 여기서 발생할 수 있는 가장 큰 기술적 과제는 무엇이라고 생각하나요?',
     '사용자가 갑자기 많이 몰릴 때 서버가 터지지 않게 하는 게 가장 큰 문제라고 생각합니다.',
     '실시간 경매 시스템의 가장 큰 기술적 과제는 대규모 트래픽 처리와 데이터 정합성 유지입니다. 수만 명의 사용자가 동시에 입찰할 때 서버 과부하를 막는 것과, 동일한 상품에 대해 동시 입찰이 들어왔을 때 정확히 누가 먼저 입찰했는지 순서를 보장하는 동시성 제어가 가장 중요하다고 생각합니다.',
     '서버 과부하를 언급한 점은 맞습니다. 하지만 포트폴리오 면접에서는 "서버가 터지지 않게"라는 표현보다는 "대규모 트래픽 분산"이나 "동시성 제어"와 같은 전문적인 개발 용어를 사용하는 것이 역량을 어필하는 데 더 유리합니다.'),

    (2,
     '이 프로젝트에서 Redis를 캐싱용으로 사용하셨는데, 캐시 갱신 전략(Cache Invalidation)은 어떻게 가져가셨나요?',
     '데이터가 바뀌면 그냥 캐시를 지우도록 했습니다.',
     '데이터 정합성을 위해 Write-Around 전략을 베이스로 하고, 캐시 만료 시간(TTL)을 짧게 설정했습니다. 또한, 상품 정보가 수정될 때는 Spring의 @CacheEvict를 활용해 즉시 해당 캐시 데이터를 삭제하여 다음 조회 시 DB에서 최신 데이터를 읽어와 캐시를 갱신하도록 구성했습니다.',
     '단순히 "지웠다"고 답변하기보다, TTL 설정이나 Write-Around, Write-Through 같은 구체적인 캐싱 전략 명칭을 언급하면 본인의 설계 의도를 훨씬 명확하게 전달할 수 있습니다.'),

    (2,
     '이력서에 JWT 기반 인증을 구현했다고 되어있습니다. 토큰이 탈취당했을 때의 보안 취약점은 어떻게 대비하셨나요?',
     'Access Token의 만료 시간을 짧게 하고 Refresh Token을 만들어서 대비했습니다.',
     'Access Token의 만료 시간을 30분으로 짧게 가져가 탈취 피해를 최소화하고, Refresh Token을 도입해 사용자 편의성을 유지했습니다. 또한, 탈취된 토큰의 즉시 무효화를 위해 Redis에 블랙리스트(Blacklist)를 구현하여 로그아웃 시 해당 토큰을 거부하도록 보안을 강화했습니다.',
     'Access와 Refresh Token을 분리한 기본적인 대처는 훌륭합니다. 하지만 면접관은 "로그아웃 처리"나 "토큰 강제 만료(블랙리스트)" 같은 엣지 케이스 처리에 대한 경험을 듣고 싶어 하므로 이 부분을 덧붙이면 좋습니다.'),

    (2,
     '프로젝트 진행 중 팀원 간의 의견 충돌이나 갈등이 있었나요? 있었다면 어떻게 해결했나요?',
     '프론트엔드랑 API 스펙 맞추는 게 힘들었는데, 그냥 모여서 회의하고 스웨거로 맞췄습니다.',
     '프론트엔드 팀원과 API 스펙 및 응답 형식에 대한 의견 차이가 있었습니다. 이를 해결하기 위해 먼저 양측의 요구사항을 문서로 정리하고, Postman과 Swagger를 활용해 Mock API를 미리 제공함으로써 개발 병목을 줄였습니다. 결과적으로 커뮤니케이션 비용을 크게 낮출 수 있었습니다.',
     '갈등 상황(API 스펙)은 아주 흔하고 좋은 소재입니다. 다만 해결 과정을 "그냥 회의했다"로 끝내지 말고, "Mock API 제공"이나 "문서화" 등 본인이 구체적으로 어떤 행동적 기여를 했는지 강조해야 합니다.'),

    (2,
     '포트폴리오 코드를 보면 예외 처리(Exception Handling)가 컨트롤러마다 흩어져 있는데, 이를 개선할 방법이 있을까요?',
     '아, 그 부분은 시간이 없어서 그렇게 짰습니다. 글로벌하게 처리할 수 있다고 들었습니다.',
     '프로젝트 마감 기한 때문에 컨트롤러 레벨에서 예외 처리를 진행했지만, 코드의 중복과 유지보수성을 고려하면 개선이 필요합니다. Spring의 @RestControllerAdvice와 @ExceptionHandler를 도입하여 전역적으로 예외를 핸들링하고, 공통된 ErrorResponse 객체로 응답을 통일하는 방식으로 리팩토링할 계획입니다.',
     '시간 부족이라는 변명은 면접에서 좋은 인상을 주지 못합니다. 아쉬운 점을 인정하더라도, "@RestControllerAdvice"와 같은 명확한 개선 기술을 언급하며 이미 리팩토링 방안을 알고 있음을 어필해야 합니다.'),

    (2,
     '데이터베이스 성능 최적화를 위해 인덱스(Index)를 적용하신 부분이 있나요?',
     '조회가 느린 부분에 인덱스를 걸었더니 빨라졌습니다.',
     '경매 입찰 내역을 조회하는 쿼리에서 Full Table Scan이 발생해 속도 저하가 있었습니다. 이를 해결하기 위해 WHERE 절에 자주 사용되는 ''상품 ID''와 ''입찰 시간'' 컬럼을 묶어 복합 인덱스(Composite Index)를 생성했습니다. 적용 후 EXPLAIN으로 실행 계획을 확인하여 조회 속도가 약 3배 향상된 것을 검증했습니다.',
     '인덱스를 적용했다는 사실보다 "어떤 컬럼에, 왜 걸었으며, 결과적으로 성능이 얼마나 개선되었는지(수치화)"를 묻는 질문입니다. EXPLAIN 쿼리 등을 통한 검증 경험을 추가해 보세요.'),

    (2,
     '본인의 코드가 완벽하다고 생각하시나요? 만약 지금 당장 이 프로젝트를 처음부터 다시 만든다면 가장 먼저 무엇을 바꾸고 싶나요?',
     '코드가 완벽하진 않습니다. 다시 만든다면 디자인을 좀 더 예쁘게 바꾸고 싶습니다.',
     '제 코드가 완벽하다고 생각하지 않습니다. 특히 테스트 코드 부재가 가장 아쉽습니다. 처음부터 다시 만든다면 핵심 비즈니스 로직(예: 재고 차감, 입찰 로직)에 대해 TDD(테스트 주도 개발)를 도입하거나 단위 테스트를 꼼꼼히 작성하여, 배포 전 버그를 잡고 코드 변경에 대한 두려움을 없애는 데 집중하고 싶습니다.',
     '백엔드 개발자 면접에서는 디자인보다 아키텍처, 성능, 또는 테스트 코드와 관련된 아쉬움을 이야기하는 것이 직무 적합성에 훨씬 잘 맞습니다. 테스트 코드나 설계 관점의 성찰을 보여주는 답변을 추천합니다.');


