-- users 테이블 더미 데이터 3개 삽입
INSERT INTO users (email, password, name, nickname)
VALUES ('hong@ssafy.com', '1234', '홍길동', '길동이'),
       ('kim@ssafy.com', '1234', '김철수', '철수야'),
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