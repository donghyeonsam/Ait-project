# BE·AI 요청사항 정리

FE 연동 작업(2026-07-23, `FE/feature/api` 브랜치) 중 발견한, FE에서 해결할 수 없는 항목들이다.
각 항목에 FE의 현재 구현 상태를 함께 적었으니 계약 협의 시 참고 바란다.

## 1. BE 요청사항

### 🔴 P0. 컨트롤러 userId 하드코딩 제거

- 대상: `ResumeController`, `CoverLetterController`, `GithubController` 전체 메서드 (`Long userId = 1L;`)
- 현상: 어떤 계정으로 로그인해도 마이페이지·이력서·자소서·깃허브 레포가 **1번 사용자 데이터**로 조회/수정된다. 소유권 검증도 없어 타인 자소서 수정·삭제가 가능하다.
- 요청: `AiInterviewController`처럼 `@AuthenticationPrincipal Long userId`로 전환 + 소유권 검증 추가.
- FE 상태: 모든 요청에 `Authorization: Bearer <accessToken>` 헤더를 이미 보내고 있다 (`src/api/http.ts`). BE만 수정되면 즉시 동작한다.

### 🔴 P0. CORS `allowCredentials` / 쿠키 설정

- 현상: `SecurityConfig`가 `setAllowCredentials(false)`인데 refreshToken은 쿠키 방식이다. 지금은 Vite 프록시(same-origin) 덕에 문제가 안 보이지만, FE가 프록시 없이 BE 도메인을 직접 호출하는 배포 환경에서는 로그인 쿠키 저장과 `/api/auth/reissue`가 모두 실패한다.
- 요청:
  - `setAllowCredentials(true)` + 배포 FE origin 명시 (credentials 사용 시 와일드카드 origin 불가)
  - 쿠키 `SameSite=Strict; Secure`도 배포 도메인 구성(FE/BE 도메인 분리 여부)에 맞는지 재검토
- FE 상태: `credentials: 'include'`로 요청 중. 401 → reissue → 원요청 재시도 로직 구현 완료.

### 🔴 P0. 면접 세션 중계 API (BE→AI) 신설

- 배경: 면접 질문 생성은 **BE 중계 방식**으로 합의됨. FE는 AI 서버를 직접 호출하지 않는다.
- AI 서버가 이미 제공 중인 엔드포인트 (BE가 중계해야 할 대상):
  - `POST /api/v1/interviews/questions` — RAG 기반 질문 5개 + rubric 생성
  - `POST /api/v1/interviews/followup` — 답변 rubric 채점 + 꼬리질문 생성
  - `POST /api/v1/interviews/answers/supplement` — 답변 보완(ai_answer) 생성
- 요청: 위 3개를 감싸는 BE API 스펙(URL, 요청/응답 DTO)을 정해서 FE에 공유. 면접 결과(질문·답변·점수) DB 저장 정책도 함께.
- FE 상태: 질문 생성(`POST /api/ai-interviews`)과 답변 제출(`POST /api/ai-interviews/{id}/answers`)은 연동 완료. 답변 제출 응답(꼬리질문) 스펙이 확정되면 꼬리질문 UI를 연결한다.
- 추가 이슈: 질문 생성 응답의 `aiInterviewId`가 snake_case 역직렬화 문제로 null이 올 수 있다. null이면 FE는 답변 제출을 건너뛰므로 BE 수정이 필요하다.

### 🟡 P1. 분석 결과 → AI 임베딩 전달 경로 수정 (BE↔AI 간 이슈)

- 현상: `ResumeAnalysisForwardClient`, `CoverLetterAnalysisForwardClient`가 `http://192.168.0.10:8000/api/resume-analysis`, `/api/cover-letter-analysis`를 호출하지만 **AI 서버에 해당 엔드포인트가 없다** (호출 즉시 404).
- AI 서버 실제 계약: `POST /api/v1/embeddings`, 페이로드 `{ user_id, items: [{ doc_type, target_id, content, title? }], replace }` (`ai/schemas/embedding.py`)
- 요청: 경로·페이로드를 AI 계약에 맞게 수정하고, AI 서버 주소는 하드코딩 대신 설정값으로 분리.
- FE 영향: 이 파이프라인이 끊겨 있으면 개인 문서 RAG가 비어 있어 면접 질문 품질이 떨어진다.

### 🟡 P1. 대시보드 / 면접 기록 API

- 현상: 대시보드(점수 추이, 면접 기록 목록, 리포트)용 BE 엔드포인트가 없다.
- FE 상태: `DashboardPage`는 빈 상태(placeholder)로 표시 중. 타입 정의는 `src/types/dashboard.ts` 참고 — 스펙 협의 시 기준으로 사용 가능.

### 🟢 P2. 이메일 인증 API

- 현상: 회원가입 화면에 "인증하기" 버튼이 있으나 BE에 이메일 인증 엔드포인트가 없다.
- FE 상태: 형식 검사만 통과하면 인증된 것으로 임시 처리 중 (`src/pages/auth/SignupPage.tsx`의 TODO 주석 참고). 인증 요청/확인 API가 생기면 연결한다.

### 🟢 P2. 소셜 로그인 (Google / GitHub OAuth)

- 현상: 로그인·회원가입 화면에 소셜 버튼이 있으나 BE OAuth 엔드포인트가 없다.
- FE 상태: 버튼은 UI만 존재. OAuth 시작 URL과 콜백 후 토큰 전달 방식(쿼리? 쿠키?)이 정해지면 연결한다.

## 2. AI 요청사항

- **임베딩 계약 협의 (P1)**: 위 BE P1 항목의 카운터파트. `POST /api/v1/embeddings` 계약을 BE와 확정하고, 필요 시 doc_type별(이력서/자소서/깃허브) 전달 시점을 문서화해 달라.
- **면접 API 응답 스키마 공유 (P0)**: `questions` / `followup` / `answers/supplement`의 응답 필드(질문 텍스트, rubric 구조, 점수 범위, 꼬리질문 조건 등)를 FE 화면 설계에 쓸 수 있게 공유해 달라. BE 중계 DTO 설계에도 필요하다.
- **CS 면접 동작 확인**: 개인 문서 임베딩이 없는 사용자도 CS 지식 면접(전역 `cs_knowledge` 컬렉션)은 동작하는지 확인해 달라. FE가 첫 연동 테스트를 CS 유형으로 진행할 예정이다.

## 3. 참고: FE 연동 현황 요약

| 기능 | FE 상태 | 비고 |
|---|---|---|
| 로그인 / 로그아웃 / 토큰 재발급 | ✅ 연동 완료 | 401 자동 재발급 포함 |
| 회원가입 | ✅ 연동 완료 (2026-07-23) | 이메일 인증만 임시 처리 |
| 마이페이지 (이력서·자소서·깃허브) | ✅ 연동 완료 | BE userId 하드코딩 해결 필요 |
| 면접 준비 정보 (`GET /api/ai-interviews`) | ✅ 연동 완료 | |
| 면접 세션 (질문 생성·답변 제출) | 🔶 부분 연동 | 답변 응답(꼬리질문) 스펙 확정 대기 |
| 대시보드 | ⏸ 빈 상태 | BE API 대기 |
| 소셜 로그인 / 이메일 인증 | ⏸ UI만 | BE API 대기 |
