# AI 모의 면접 - FastAPI

이력서/자소서/GitHub 분석 데이터를 **Chroma DB**에 임베딩하고, 면접 시작 시 **RAG**로
관련 문서를 검색해 **GMS LLM(gpt-5.4-nano)**으로 질문과 꼬리질문을 생성하는 AI 서비스.

## 아키텍처

```
Spring Boot (BE)
   │  ① 이력서/자소서/깃허브 분석(analyses) 저장 후
   │     POST /api/v1/embeddings         ──► Chroma 임베딩
   │
   │  ② 면접 시작 (ai_interviews 세션 생성 후)
   │     POST /api/v1/interviews/questions ──► RAG 검색 + GMS ──► 질문 5개 + rubric(채점 기준)
   │
   │  ③ 사용자 답변 저장 후 (동기)
   │     POST /api/v1/interviews/followup  ──► GMS ──► rubric 채점 + 동적 꼬리질문
   │
   │  ④ 사용자 답변 저장 직후 (비동기 백그라운드)
   │     POST /api/v1/interviews/answers/supplement ──► GMS ──► 답변 보완(ai_answer)
   ▼
FastAPI (AI)  ── Chroma(영속) + GMS gpt-5.4-nano
```

BE는 결과를 `ai_interview_questions`(question/user_answer/ai_answer/feedback) 테이블에 저장한다.
`ai_answer`는 질문 생성 시점이 아니라, 사용자가 실제로 답변을 제출한 뒤 ③에서 얻은
rubric 채점 결과를 참고해 ④가 비동기로 채워 넣는다(루브릭 아키텍처, 자세한 내용은
`docs/rubric_architecture_migration.md` 참고).

## 실행

```bash
cp .env.example .env      # GMS_KEY 등 입력
docker compose up --build
# → http://localhost:8000/docs (Swagger)
```

첫 빌드 시 한국어 임베딩 모델(`jhgan/ko-sroberta-multitask`)을 다운로드/캐시한다.

## 디렉토리 구조

```
ai/
├── main.py                     # FastAPI 엔트리포인트
├── requirements.txt
├── Dockerfile / docker-compose.yml / .env.example
└── app/
    ├── config.py               # 환경변수 설정
    ├── core/gms_client.py      # GMS LLM (gpt-5.4-nano) async 클라이언트
    ├── db/chroma.py            # Chroma 영속 클라이언트 + 한국어 임베딩
    ├── schemas/               # Pydantic 요청/응답
    ├── prompts/templates.py    # 면접 유형별 프롬프트
    ├── services/
    │   ├── embedding_service.py  # 청킹 + Chroma 저장
    │   ├── rag_service.py         # user_id 필터 유사도 검색
    │   ├── question_service.py    # 질문 5개 + rubric(채점 기준) 생성
    │   ├── followup_service.py    # rubric 채점 + 동적 꼬리질문 (횟수 상한은 안전장치)
    │   └── answer_service.py      # 답변 보완(ai_answer) 생성 — 답변 제출 후 비동기 호출
    └── routers/               # 엔드포인트
```

## API

### 1. 임베딩 저장 — `POST /api/v1/embeddings`

BE가 `analyses` 저장 후 호출. `replace=true`면 해당 user_id 기존 임베딩 삭제 후 재삽입.

```json
{
  "user_id": 1,
  "replace": true,
  "items": [
    { "doc_type": "resume",       "target_id": 10, "title": "이력서",       "content": "..." },
    { "doc_type": "cover_letter", "target_id": 22, "title": "네이버 지원",  "content": "..." },
    { "doc_type": "github",       "target_id": 5,  "title": "my-project",  "content": "레포 분석 내용..." }
  ]
}
```

> `doc_type`은 ERD `analyses.type`(resume/cover_letter/github), `target_id`는 `analyses.target_id`와 매핑.

### 2. 질문 생성 — `POST /api/v1/interviews/questions`

면접 시작 시 호출. `interview_type`: `job` / `cs` / `tech` / `portfolio` / `comprehensive`.

```json
{
  "user_id": 1,
  "ai_interview_id": 100,
  "interview_type": "tech",
  "difficulty": "normal",
  "company_name": "삼성전자",
  "position": "백엔드 개발자"
}
```

응답: `questions[]` 각 항목에 `question`, `rubric`(채점 기준 2~3개), `topic`, `source`.
(`expected_answer`는 더 이상 생성하지 않는다 — 답변 보완은 답변 제출 후 4번 API가 담당)

### 3. 꼬리질문 — `POST /api/v1/interviews/followup`

답변 저장 후 호출. 2번 API에서 받은 해당 질문의 `rubric`을 함께 넘겨야 한다.
`followup_depth`는 현재까지 나간 꼬리질문 횟수(BE가 관리) — 종료 판단의 주 기준이 아니라
무한 반복을 막는 안전장치용 상한(기본 2)이며, 도달 시 LLM 호출 없이 `capped=true`로 종료.

```json
{
  "user_id": 1,
  "ai_interview_id": 100,
  "parent_question": "React에서 상태 관리를 어떻게 했나요?",
  "rubric": ["Redux 도입 이유를 설명했는가", "다른 대안과 비교했는가"],
  "user_answer": "Redux를 썼습니다.",
  "interview_type": "tech",
  "followup_depth": 0
}
```

응답: `rubric_results`(항목별 pass/fail), `all_passed`, `followup_question`, `followup_depth`(누적), `capped`.
`all_passed=true`면 BE는 다음 기본 질문으로 진행, `false`면 `followup_question`을 다음 차례로 제시.

### 4. 답변 보완 — `POST /api/v1/interviews/answers/supplement`

사용자 답변을 DB에 저장한 직후, 면접 진행을 막지 않는 **비동기 백그라운드**로 호출.
3번 API의 `rubric_results`를 함께 넘기면 재채점 없이 놓친 부분만 겨냥해 보완한다(선택 사항).

```json
{
  "user_id": 1,
  "ai_interview_id": 100,
  "question": "React에서 상태 관리를 어떻게 했나요?",
  "rubric": ["Redux 도입 이유를 설명했는가", "다른 대안과 비교했는가"],
  "rubric_results": [
    {"criterion": "Redux 도입 이유를 설명했는가", "passed": false, "reason": "이유 언급 없음"}
  ],
  "user_answer": "Redux를 썼습니다.",
  "interview_type": "tech"
}
```

응답: `question`, `ai_answer`(`ai_interview_questions.ai_answer` 저장용, 사용자 답변을 보완한 결과).

### 5. 임베딩 삭제 — `DELETE /api/v1/embeddings/{user_id}`

## 면접 규칙 (설정값 — `.env`)

| 항목 | 기본값 | 환경변수 |
|---|---|---|
| 질문 개수 | 5 | `QUESTION_COUNT` |
| 질문당 rubric 개수 | 2~3 | `RUBRIC_MIN_COUNT` / `RUBRIC_MAX_COUNT` |
| 질문당 꼬리질문 최대(안전장치) | 2 | `MAX_FOLLOWUP_PER_QUESTION` |
| RAG top-k | 5 | `RAG_TOP_K` |

## 면접 유형별 RAG 문서 우선순위

| 유형 | 참고 문서 |
|---|---|
| job (직무) | 이력서 + 자소서 |
| tech (기술) | GitHub + 이력서 |
| portfolio (포폴) | GitHub + 이력서 |
| cs (CS) | (개인 문서 미사용 — CS 지식 임베딩 추후 추가) |
| comprehensive (종합) | 전체 |

> **CS 면접**: `rag_service.py`의 `INTERVIEW_DOC_PREFERENCE`에서 CS는 개인 문서를 검색하지 않도록
> 비워둠. 추후 CS 지식 데이터를 별도 doc_type으로 임베딩하면 자동 연동된다.

## GMS 연동 메모

- gpt-5 계열이라 지시문을 `system`이 아닌 **`developer` role**로 전송한다 (`gms_client.py`).
- `response_format: json_object`로 JSON 강제 + 코드펜스 방어 파서 내장.
- 실패 시 tenacity로 최대 3회 지수 백오프 재시도.
```
