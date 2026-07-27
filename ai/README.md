# AI 모의 면접 - FastAPI

이력서/자소서/GitHub 분석 데이터를 **Chroma DB**에 임베딩하고, 면접 시작 시 **RAG**로
관련 문서를 검색해 **GMS LLM(gpt-5.4-nano)**으로 질문과 꼬리질문을 생성하는 AI 서비스.
CS 면접은 사용자가 고른 CS 카테고리(9종) 범위 내에서만 질문을 생성하고, 면접 유형별로
이력서/자소서/GitHub 참고 비율을 다르게 적용한다.

## 아키텍처

```
Spring Boot (BE)
   │  ① 이력서/자소서/깃허브 분석(analyses) 저장 후
   │     POST /api/v1/embeddings         ──► Chroma 임베딩(user_documents 컬렉션)
   │
   │  (서버 최초 기동 시 1회, BE 호출 아님) CS 지식 시드 데이터 자동 임베딩
   │     → Chroma(cs_knowledge 컬렉션). 원본 갱신 시에만 관리용
   │     POST/DELETE /api/v1/cs-knowledge 로 수동 재구축.
   │
   │  ② 면접 시작 (ai_interviews 세션 생성 후)
   │     POST /api/v1/interviews/questions ──► RAG 검색(문서 참고 비율 적용,
   │       CS면접은 cs_categories 로 검색 범위 제한) + GMS ──► 질문 5개 + rubric(채점 기준)
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
`docs/AI_작업일지_0722.md` 1절 참고). CS 카테고리 제한/문서 참고 비율 기능은 같은 문서
3절 참고.

## 아키텍처 스타일 & 디자인 패턴

### 전체 스타일
- **레이어드 아키텍처(Layered Architecture)**: `routers/`(HTTP 요청/응답, 예외를
  상태 코드로 변환) → `services/`(면접 규칙/RAG 조합/응답 정규화 등 실제 비즈니스 로직)
  → `core/`, `db/`(GMS LLM·Chroma 벡터DB 등 외부 시스템 연동 게이트웨이) 3계층으로
  책임을 분리한다. 라우터는 얇게 유지하고, 실제 판단 로직은 전부 services에 있다.
- **RAG(Retrieval-Augmented Generation) 파이프라인**: "색인(임베딩)"과 "검색+생성"
  단계를 분리한 전형적인 RAG 구조. `services/embedding_service.py`/
  `cs_embedding_service.py`가 색인을, `services/rag_service.py`가 검색(Retrieval)을,
  `services/question_service.py` 등이 검색 결과를 프롬프트에 넣어 LLM 생성을
  담당한다(Retrieval → Augment → Generate).
- **비동기(async I/O)**: FastAPI 엔드포인트와 GMS 호출(`httpx.AsyncClient`)이 모두
  `async/await` 기반 — LLM 응답을 기다리는 동안 다른 요청을 블로킹하지 않는다.

### 사용 중인 디자인 패턴
- **Singleton(지연 초기화)**: `db/chroma.py`의 Chroma 클라이언트/임베딩 함수/컬렉션
  객체(`_client`, `_embedding_fn`, `_collections`), `core/gms_client.py`의
  `gms_client`, `config.py`의 `get_settings()`(`@lru_cache`)가 전부 모듈 전역에
  단 한 번만 생성되어 재사용된다 — SentenceTransformer 모델처럼 로딩 비용이 큰
  리소스를 매 요청마다 새로 만들지 않기 위함.
- **Gateway(단일 접근 창구)**: `db/chroma.py`가 벡터DB에 대한 유일한 접근 창구다.
  다른 서비스는 Chroma 클라이언트를 직접 만들지 않고 반드시
  `get_collection()`/`get_cs_collection()`을 통해서만 컬렉션을 얻는다.
- **Adapter/Facade**: `core/gms_client.py`가 GMS(OpenAI 호환) HTTP API의 프로토콜
  세부사항(payload 형식, 재시도, 에러 변환)을 감춰, 서비스 계층은 `chat_json()`
  호출 하나만 알면 되게 한다.
- **Retry(재시도)**: `tenacity`로 GMS 호출의 일시적 장애(5xx/네트워크 오류)만
  지수 백오프로 최대 3회 재시도하고, 4xx는 즉시 실패시킨다(`gms_client.py`).
- **테이블 기반 전략(Table-driven Strategy)**: `InterviewType`/`CSCategory` enum을
  키로 하는 dict(`INTERVIEW_TYPE_GUIDE`, `DOC_TYPE_WEIGHTS`, `CS_CATEGORY_RAW_MAP`)로
  "면접 유형/카테고리별 동작"을 분기한다. if/else 분기 대신 표 하나로 정책을
  정의해두어, 코드 흐름을 몰라도 표의 값만 바꿔 정책을 조정할 수 있게 한다
  (예: 문서 참고 비율 조정은 `DOC_TYPE_WEIGHTS` 숫자만 바꾸면 됨).
- **DTO 기반 경계 검증**: 모든 요청/응답을 `schemas/`의 Pydantic 모델로 검증한다 —
  API 경계(`routers/`)에서만 유효성 검사를 하고, 통과한 이후 내부 로직은 타입을
  그대로 신뢰한다(예: CS 면접인데 `cs_categories`가 비어있으면 서비스 로직 진입 전
  스키마 단계에서 422로 차단).
- **방어적 폴백(Graceful Degradation)**: Chroma 조회 실패/빈 컬렉션 시 빈 리스트
  반환(`rag_service.py`), LLM 응답 파싱 실패 시 코드펜스 방어 파서 재시도
  (`gms_client.py`), 답변 보완 결과가 비면 사용자 원문으로 폴백(`answer_service.py`)
  등 — 부분 실패가 전체 요청 실패로 번지지 않도록 각 단계에서 안전한 기본값을 반환한다.
- **One-Call JSON Mode**: 꼬리질문 생성(`followup_service.py`)에서 "rubric 채점"과
  "꼬리질문 생성"을 LLM 호출 1회로 동시에 처리하는 이 서비스만의 설계 기법 —
  왕복 호출을 줄이고 채점 근거와 질문이 서로 일관되게 만든다.

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
├── main.py                     # FastAPI 엔트리포인트 + lifespan(모델/컬렉션 프리로딩, CS 시드)
├── config.py                   # 환경변수 설정 (.env 로드)
├── requirements.txt
├── Dockerfile / docker-compose.yml / .env.example
├── data/cs_knowledge.json      # CS 지식 시드 데이터 (gyoogle 기반, 서버 기동 시 자동 임베딩)
├── cs_knowledge_dataset.md     # 위 시드 데이터 생성 경위 설명
├── docs/                       # 작업 문서 (api_reference.md, AI_작업일지_0722.md)
├── core/gms_client.py          # GMS LLM (gpt-5.4-nano) async 클라이언트
├── db/chroma.py                 # Chroma 영속 클라이언트 + 한국어 임베딩 (컬렉션 2개 관리)
├── schemas/                     # Pydantic 요청/응답
│   ├── common.py                  # InterviewType/DocType/Difficulty/CSCategory enum
│   ├── embedding.py                # 개인 문서 임베딩 요청/응답
│   ├── cs_knowledge.py              # CS 지식 임베딩 요청/응답
│   └── interview.py                 # 질문/꼬리질문/답변보완 요청·응답
├── prompts/templates.py         # 면접 유형별 프롬프트 (질문/꼬리질문/답변보완)
├── services/
│   ├── embedding_service.py       # 청킹 + Chroma 저장 (개인 문서)
│   ├── cs_embedding_service.py     # 청킹 + Chroma 저장 (CS 전역 지식) + 서버 기동 시 자동 시딩
│   ├── rag_service.py              # 유사도 검색 + 면접 유형별 문서 참고 비율 + CS 카테고리 필터
│   ├── question_service.py         # 질문 5개 + rubric(채점 기준) 생성, CS 카테고리 제한 로직
│   ├── followup_service.py         # rubric 채점 + 동적 꼬리질문 (횟수 상한은 안전장치)
│   └── answer_service.py           # 답변 보완(ai_answer) 생성 — 답변 제출 후 비동기 호출
└── routers/                     # 엔드포인트 (health/embedding/interview/cs_knowledge)
```

## API

### 1. 임베딩 저장 — `POST /api/v1/embeddings`

BE가 `analyses` 저장 후 호출. `replace=true`면 해당 user_id 기존 임베딩 삭제 후 재삽입.
**요청 스키마(`EmbedRequest`/`EmbeddingItem`) 자체는 바뀌지 않았다** — `items[].content`는
여전히 문자열(`str`) 필드다.

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

> ⚠️ **구조화 분석 문서 포맷 지원 (2026-07-24)**: `items[].content`에 BE의 "분석 LLM"이
> 만든 구조화된 JSON(`schema_version`/`document_type`/`document_summary`/
> `embedding_documents[]`/`cross_document_insights`)을 **문자열로** 실어 보내면, AI
> 서비스가 이를 자동으로 인식해(내용에 `"embedding_documents"` 키가 있는지로 판별)
> 청크 단위 메타데이터(역량/면접 질문 주제/키워드/불확실한 점 등)까지 함께 Chroma에
> 저장하고, 질문 생성/꼬리질문 프롬프트에도 활용한다. 기존처럼 평문 텍스트를 보내는
> 것도 계속 그대로 지원된다(자동 판별 — BE가 별도 마이그레이션할 필요 없음). 상세
> 스펙/필드 설명/BE 영향은 `docs/AI_작업일지_0724.md` 참고.

### 2. 질문 생성 — `POST /api/v1/interviews/questions`

면접 시작 시 호출. `interview_type`: `job` / `cs` / `tech` / `portfolio` / `comprehensive`
(대소문자 무관 — `"CS"`로 와도 내부에서 소문자로 정규화한다).

> ⚠️ **요청 형식 변경 (2026-07-23)**: BE가 실제로 보내는 값이 한글 라벨/대문자인 필드가
> 있다(`difficulty`, `ai_attitude_style`, `cs_categories`). 아래 예시는 BE가 실제로 보내는
> wire 포맷 기준이며, 서버가 내부적으로 영문 enum으로 변환한다. 자세한 매핑 근거와
> "BE 확인 필요" 항목은 `docs/AI_작업일지_0723.md` 2절 참고.

```json
{
  "user_id": "1",
  "ai_interview_id": "100",
  "position": "백엔드 개발자",
  "career": "신입",
  "skills": ["Java", "Spring Boot", "MySQL", "Redis"],
  "resume_id": "1",
  "cover_letter_id": "1",
  "github_repo_id": "1",
  "interview_type": "CS",
  "cs_categories": ["자료구조", "네트워크", "운영체제"],
  "difficulty": "중",
  "ai_attitude_style": "압박면접"
}
```

- `user_id`/`ai_interview_id`/`resume_id`/`cover_letter_id`/`github_repo_id`는 숫자
  문자열(`"1"`)로 와도 pydantic이 자동으로 int로 변환한다.
- `difficulty`: 한글 라벨(`하`/`중`/`상`)로 온다 → 내부적으로 `easy`/`normal`/`hard`로
  매핑(`schemas/common.py`의 `DIFFICULTY_KOREAN_INPUT_MAP`). 미지정 시 `중`(normal) 기본값.
- `ai_attitude_style`(면접관 스타일/태도, **필드명이 기존 `interviewer_style`에서
  변경됨** — Breaking Change): 한글 라벨(`편안한 면접`/`실전 면접`/`압박면접`)로 온다 →
  내부적으로 `comfortable`/`realistic`/`pressure`로 매핑
  (`schemas/common.py`의 `INTERVIEWER_STYLE_KOREAN_INPUT_MAP`). 미지정 시 `실전 면접`
  (realistic) 기본값. 질문의 내용/난이도/rubric에는 영향을 주지 않고 오직 질문의
  말투/어조에만 반영된다. 현재는 질문 생성(`/questions`)에만 적용되며 꼬리질문
  (`/followup`)/답변 보완(`/answers/supplement`)에는 아직 반영되지 않는다.
- `career`(경력), `skills`(보유 기술 스킬)는 선택 필드이며, RAG 검색 쿼리와 프롬프트
  "지원 정보" 섹션에 반영된다.
- `resume_id`/`cover_letter_id`/`github_repo_id`(신규, 선택 필드): 이 면접에서 참고할
  "특정" 문서의 `analyses.target_id`. 지정하면 RAG 검색 범위가 "이 사용자의 전체 문서"가
  아니라 "이 특정 문서"로 좁혀진다. 지정하지 않은 문서 종류는 기존처럼 사용자의 해당
  타입 문서 전체에서 유사도 검색한다.
- `interview_type`이 `cs`(대소문자 무관)이면 `cs_categories`가 **최소 1개 필수**다
  (없으면 422). 그 외 유형이면 빈 배열(`[]`)로 보내면 된다. **기존 단일 선택
  `cs_category` 필드를 완전히 대체**하는 Breaking Change이며, 최대 3개까지 배열로
  받는다. 값은 한글 라벨(`자료구조`/`네트워크`/`운영체제` 등)로 오며 내부적으로
  9종 `CSCategory` enum으로 매핑된다(`schemas/common.py`의
  `CS_CATEGORY_KOREAN_INPUT_MAP` — 현재 3개 라벨만 BE에서 확인됨, 나머지는 확인 필요).
  질문은 선택한 카테고리(들) 범위 내에서만 생성되며, 지원자 개인 문서가 해당
  카테고리와 무관하다고 판단되면(코사인 거리 임계값 초과) 카테고리 내 CS 지식에서
  무작위로 근거를 뽑아 질문을 만든다(자세한 로직은 `docs/AI_작업일지_0722.md` 3절 참고).

응답: `questions[]` 각 항목에 `question`, `rubric`(채점 기준 2~3개), `topic`, `source`.
(`expected_answer`는 더 이상 생성하지 않는다 — 답변 보완은 답변 제출 후 4번 API가 담당)
응답 스키마 자체는 이번 요청 형식 변경과 무관하게 그대로다.

### 3. 꼬리질문 — `POST /api/v1/interviews/followup`

> ⚠️ **요청/응답 형식 전면 개편 — rubric narrowing 전환 (2026-07-26, Breaking
> Change)**: 매 턴 rubric 전체를 재채점하던 기존 방식은 FastAPI가 stateless라
> "이전 턴에 어떤 rubric이 이미 통과됐는지" 알 방법이 없어, 같은 rubric이 턴마다
> pass/fail을 오가는 진동(예: A 답변 턴에 B가 fail, B 답변 턴에 A가 도로 fail)이
> 발생했다. 이제는 **통과한 rubric 항목을 응답에서 제거해 내려주는** 방식으로
> 바꿔, 다음 턴에는 미통과 항목만 요청에 실리게 했다 — 이미 통과한 항목을 재채점할
> 코드 경로 자체가 없어지므로 진동이 구조적으로 불가능해진다. 상세 배경/검토했다가
> 기각한 대안은 `docs/AI_작업일지_0726.md` 참고.

답변 저장 후 호출. `question`에는 **직전 턴 응답의 `next_question`을 가공 없이
그대로** 실어 보내야 한다(첫 호출이라면 2번 API로 받은 해당 질문 그대로).
`question.rubric`의 의미가 **"이 질문의 전체 채점 기준"이 아니라 "아직 통과하지
못한 채점 기준"**으로 재정의됐다는 점에 주의 — rubric을 임의로 추가/복원하면
통과한 기준이 되살아나 진동이 재발한다.

```json
{
  "user_id": 1,
  "interview_type": "cs",
  "resume_id": 1,
  "cover_letter_id": 1,
  "github_repo_id": 1,
  "question": {
    "order": 1,
    "question": "Redis를 캐시로 도입하셨다고 하셨는데, TTL 설정 기준은 어떻게 정하셨나요?",
    "rubric": ["TTL 값을 정한 구체적인 근거를 설명했는가", "캐시 무효화 전략을 함께 언급했는가"],
    "topic": "캐싱 전략",
    "source": "cover_letter",
    "depth": 0
  },
  "answer": "레디스를 캐시로 도입한 이유는 저도 잘 모르겠습니다."
}
```

| 변경 | 내용 |
|---|---|
| 제거(요청) | `parent_question` → `question.question`으로 이동 |
| 제거(요청) | `rubric`(최상위) → `question.rubric`으로 이동(의미도 "전체 기준"→"미통과 기준"으로 재정의) |
| 제거(요청) | `depth`(최상위) → `question.depth`로 이동 |
| 변경 | `user_answer` → `answer` |
| 유지 | `interview_type`, `resume_id`, `cover_letter_id`, `github_repo_id` |
| 유지(선택, 응답에서는 제거) | `ai_interview_id` — 로깅 전용으로만 요청에서 받는다 |
| 신규 | `question.order`, `question.topic`, `question.source` |

- `resume_id`/`cover_letter_id`/`github_repo_id`: 2번 API(질문 생성) 요청 때 지정한
  값과 **동일한 값을 그대로** 넘겨야 한다. AI 서비스는 세션 상태를 저장하지 않으므로,
  이 값을 안 보내면 꼬리질문 RAG 검색이 이번 면접에서 지정한 문서가 아니라 사용자의
  해당 타입 문서 전체를 대상으로 이뤄진다.
- `question.depth`는 현재까지 이 질문에 나간 꼬리질문 횟수 — 종료 판단의 주 기준이
  아니라 무한 반복을 막는 안전장치용 상한(기본 2)이며, 도달 시 LLM 호출 없이
  `is_pass=true`로 강제 종료한다.

```json
// 꼬리질문이 필요한 경우
{
  "is_pass": false,
  "next_question": {
    "order": 1,
    "question": "그렇다면 TTL을 짧게 잡았을 때와 길게 잡았을 때 각각 어떤 문제가 생길 수 있을까요?",
    "rubric": ["TTL 값을 정한 구체적인 근거를 설명했는가"],
    "topic": "캐싱 전략",
    "source": "cover_letter",
    "depth": 1
  }
}

// 꼬리질문이 필요 없는 경우
{
  "is_pass": true,
  "next_question": null
}
```

`next_question`은 2번 API 응답의 `GeneratedQuestion`과 **동일한 필드 구성**이다 —
소비하는 쪽에서 두 객체를 같은 타입으로 다룰 수 있게 하기 위함이며, BE는 이 값을
다음 `/followup` 호출의 `question`에 그대로 되돌려 보내면 된다.

`is_pass=true`면 BE는 다음 기본 질문으로 진행, `false`면 `next_question`을 다음
차례로 제시한다. `is_pass=true`는 **"모든 rubric을 통과함"과 "꼬리질문 횟수 상한
도달로 강제 종료함"** 두 경우를 모두 포함한다 — 이 둘을 구분해야 한다면 요청에
실어 보낸 `question.depth` 값으로 판단해야 한다(응답 자체에는 별도 플래그가 없다).

### 4. 답변 보완 — `POST /api/v1/interviews/answers/supplement`

사용자 답변을 DB에 저장한 직후, 면접 진행을 막지 않는 **비동기 백그라운드**로 호출.
`rubric`에 3번 API(`/followup`) 요청 때 넘겼던 `question.rubric`(미통과 채점 기준)을
그대로 넘기면, 재채점 없이 그 기준을 겨냥해 보완한다(선택 사항).

> ⚠️ **`rubric_results` 필드 제거 (2026-07-26, rubric narrowing 전환에 따른
> Breaking Change)**: narrowing 전환으로 `/followup`이 더 이상 rubric 항목별
> pass/fail 채점 결과를 반환하지 않으므로(3번 API 참고), 이 API도 별도 채점
> 결과 없이 `rubric` 목록만으로 "놓친 기준"을 판단한다.

```json
{
  "user_id": 1,
  "ai_interview_id": 100,
  "question": "React에서 상태 관리를 어떻게 했나요?",
  "rubric": ["Redux 도입 이유를 설명했는가"],
  "user_answer": "Redux를 썼습니다.",
  "interview_type": "tech",
  "resume_id": 1,
  "cover_letter_id": 1,
  "github_repo_id": 1
}
```

- `resume_id`/`cover_letter_id`/`github_repo_id`(신규, 선택 필드): 3번 API와 동일 —
  이번 면접에서 지정한 문서 id를 그대로 넘겨야 답변 보완 RAG 검색도 같은 문서를
  근거로 삼는다.

응답: `question`, `ai_answer`(`ai_interview_questions.ai_answer` 저장용, 사용자 답변을 보완한 결과).

### 5. 임베딩 삭제 — `DELETE /api/v1/embeddings/{user_id}`

### 6. CS 지식 관리 — `POST` / `DELETE /api/v1/cs-knowledge`

CS 전역 지식(`cs_knowledge` 컬렉션, user_id 없이 모든 사용자 공유)을 관리하는 API.
서버 최초 기동 시 `data/cs_knowledge.json`으로 자동 시딩되므로(컬렉션이 비어있을 때만),
평상시에는 호출할 일이 없다. CS 지식 원본이 갱신되어 전량 재구축이 필요할 때만
운영자/BE가 수동으로 호출하는 관리용 엔드포인트다.

```json
// POST /api/v1/cs-knowledge
{
  "items": [
    { "category": "Computer Science > Database", "concept": "인덱스", "content": "..." }
  ],
  "replace": false
}
```

`DELETE /api/v1/cs-knowledge`는 컬렉션 전체를 비운다(전량 재구축 전 사용, 파라미터 없음).

## 면접 규칙 (설정값 — `.env` / `config.py`)

| 항목 | 기본값 | 환경변수 |
|---|---|---|
| 질문 개수 | 5 | `QUESTION_COUNT` |
| 질문당 rubric 개수 | 2~3 | `RUBRIC_MIN_COUNT` / `RUBRIC_MAX_COUNT` |
| 질문당 꼬리질문 최대(안전장치) | 2 | `MAX_FOLLOWUP_PER_QUESTION` |
| 개인 문서 RAG top-k | 5 | `RAG_TOP_K` |
| CS 지식 RAG top-k | 4 | (`config.py`의 `cs_top_k`, `.env.example` 미등록) |
| CS 카테고리-개인 문서 관련도 임계값(코사인 거리) | 0.45 | (`config.py`의 `cs_relevance_distance_threshold`) |

## 면접 유형별 문서 참고 비율

`services/rag_service.py`의 `DOC_TYPE_WEIGHTS` 표 하나로 관리하며, 숫자만 바꾸면 즉시
반영된다(100 기준 %):

| 면접 유형 | 이력서 | 자소서 | GitHub |
|---|---|---|---|
| job (직무) | 50 | 40 | 10 |
| cs (CS) | 10 | 40 | 50 |
| tech (기술) | 10 | 40 | 50 |
| portfolio (포폴) | 10 | 30 | 60 |
| comprehensive (종합) | 고정 비율 없음 — 질문 특성/유사도에 맡김 |

전체 top_k를 doc_type(이력서/자소서/GitHub)별로 비율만큼 쪼개 각각 따로 검색한 뒤
합치는 방식이라(최대 나머지법으로 배분), 위 표의 비율이 실제로 보장된다. 이 배분은
질문 생성뿐 아니라 꼬리질문 채점(`followup_service.py`)·답변 보완(`answer_service.py`)의
RAG 검색에도 동일하게 적용된다.

**CS 면접**: 위 비율과 별개로, `cs_categories`(최대 3개)로 CS 지식 검색 범위 자체를
해당 카테고리(들)의 합집합으로 하드 제한한다(`retrieve_cs_knowledge`의 category `$in`
필터). 개인 문서가 선택한 카테고리(들)와 무관하면(코사인 거리가 임계값 초과) 개인
문서를 버리고 카테고리 내에서 무작위로 CS 지식을 뽑는다. 자세한 내용/카테고리 매핑
표는 `docs/AI_작업일지_0722.md` 3절, 다중 선택으로 바뀐 배경은 `docs/AI_작업일지_0723.md`
2절 참고. (⚠️ 현재 "보안" 카테고리는 시드 데이터가 없어 CS 지식 검색이 항상 0건이다.)

## GMS 연동 메모

- gpt-5 계열이라 지시문을 `system`이 아닌 **`developer` role**로 전송한다 (`gms_client.py`).
- `response_format: json_object`로 JSON 강제 + 코드펜스 방어 파서 내장.
- 실패 시 tenacity로 최대 3회 지수 백오프 재시도.
