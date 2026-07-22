# AI 모의 면접 서비스 — API 레퍼런스 (BE 연동 가이드)

> 이 문서는 `ai/` FastAPI 서비스가 노출하는 **모든 엔드포인트**를 BE(Spring Boot) 개발자가
> 연동 체크리스트로 쓸 수 있도록 정리한 것이다. 각 엔드포인트의 호출 시점, 요청/응답
> 파라미터, 에러 케이스, BE가 저장/전달해야 할 상태를 전부 포함한다.
> 아키텍처 배경/남은 작업은 [`AI_작업일지_0722.md`](./AI_작업일지_0722.md)의 1절/2절 참고.

---

## 0. 공통 사항

- **Base URL**: 배포 환경의 FastAPI 컨테이너 주소 (예: `http://ai:8000`, docker-compose 내부 네트워크 기준)
- **인증**: 현재 코드상 별도 API 키/토큰 검증 로직이 없다. BE→AI 호출은 내부망(같은
  docker-compose 네트워크) 간 호출을 전제로 설계되어 있다. 외부 노출이 필요하다면
  별도 인증 계층 추가가 필요하며, 이는 이번 작업 범위에 포함되지 않았다.
- **Content-Type**: 모든 요청/응답은 `application/json`.
- **에러 응답 공통 형식**: FastAPI 기본 `HTTPException` 형식 — `{"detail": "에러 메시지"}`.
- **상태 비저장(stateless)**: AI 서비스는 Redis/MySQL 등 어떤 영속 저장소도 직접
  다루지 않는다. 모든 "이전 상태"(rubric, 채점 결과 등)는 매 요청마다 BE가 파라미터로
  실어 보내야 한다 — AI 쪽에 세션이나 캐시가 없다.
- **동기/비동기 여부는 API 스펙이 아니라 BE의 호출 방식 문제**다. 어떤 엔드포인트든
  FastAPI 입장에서는 평범한 동기식 HTTP 요청-응답이며, "비동기로 호출하라"는 표시가
  있는 엔드포인트는 BE가 그 응답을 기다리지 않고 백그라운드 스레드/큐에서 호출해야
  한다는 **BE 쪽 호출 패턴에 대한 권장사항**이다.

---

## 0.1 시스템 경계 — FE는 AI 서비스를 절대 직접 호출하지 않는다

이 문서의 모든 엔드포인트는 **오직 Spring Boot(BE)만 호출자**다. React(FE)는 AI
서비스의 URL/스키마를 전혀 알지 못하고, 알 필요도 없다 — FE는 언제나 BE 하고만
통신하고, BE가 그 요청을 받아 필요할 때만 내부적으로 AI를 호출한 뒤 결과를 가공해서
FE에 돌려준다.

```
┌─────────────┐        ┌──────────────────┐        ┌─────────────────┐
│  Frontend   │───①──▶│  Spring Boot(BE)  │───②──▶│  FastAPI(AI)     │
│  (React)    │◀──④───│                    │◀──③───│  (이 문서의 API)  │
└─────────────┘        └──────────────────┘        └─────────────────┘
   FE는 이 경계를 절대 넘어오지 않음 ─┘        └─ 이 구간만 이 문서 대상

① FE → BE   : 사용자 액션(면접 시작 클릭, 답변 제출/STT 결과 등)을 BE 자체 API로 전송
              (예: POST /api/interviews, POST /api/interviews/{id}/answers 같은 BE 전용 엔드포인트 —
              이 문서와는 별개의, BE가 정의하는 FE 대상 API. ai/ 폴더 밖의 영역이라 정확한
              스펙은 BE 저장소를 확인해야 한다)

② BE → AI   : ①을 처리하는 도중 AI 판단/생성이 필요한 시점에만 이 문서의 엔드포인트
              (/api/v1/interviews/questions, /followup, /answers/supplement 등)를 호출.
              이때 요청 바디는 5절에서 정의한 스키마 그대로.

③ AI → BE   : 이 문서에서 정의한 응답 JSON(rubric, all_passed, ai_answer 등)을 그대로 BE에 반환.
              여기 나온 필드명(rubric_results, capped 등)은 AI↔BE 사이의 내부 계약이며,
              FE가 그 원형을 그대로 받아볼 필요는 없다.

④ BE → FE   : BE가 ③의 응답을 받아 자신의 도메인 모델/DB 상태와 합친 뒤, FE가 쓰기
              편한 형태(예: 다음에 보여줄 질문 텍스트, 면접 진행 상태)로 가공해서 응답.
              이 가공 과정(어떤 필드를 얼마나 노출할지)은 전적으로 BE의 설계이며, AI
              서비스는 이 부분에 관여하지 않는다.
```

**정리**: 이 API 레퍼런스 문서 전체는 위 다이어그램의 **②③ 구간(BE ↔ AI)**만을
다룬다. ①④ 구간(FE ↔ BE)은 BE 저장소의 별도 API 문서를 봐야 하며, `ai/` 폴더 안에는
그 스펙이 존재하지 않는다(AI 서비스 코드가 FE의 존재를 아예 모르기 때문).

---

## 1. 전체 흐름 개요

```
① 이력서/자소서/GitHub 분석 완료
   BE → POST /api/v1/embeddings                (동기)

② (최초 1회, 서버 기동 시 자동) CS 지식 시딩 — BE 호출 불필요
   POST /api/v1/cs-knowledge 는 CS 지식 원본이 갱신되어 전량 재구축이 필요할 때만 사용

③ 면접 시작
   BE → POST /api/v1/interviews/questions      (동기) → 질문 5개 + rubric 수신
   BE 는 질문/rubric 을 세션 상태(Redis Queue 등)에 저장

④ 사용자가 (기본 질문 또는 꼬리질문에) 답변 제출
   BE 가 답변을 저장한 뒤 두 가지를 호출:

   ④-A BE → POST /api/v1/interviews/followup            (동기 — 면접 진행에 필요)
        rubric 채점 결과 + all_passed 로 "다음 기본 질문 vs 꼬리질문" 분기 결정

   ④-B BE → POST /api/v1/interviews/answers/supplement   (비동기 — 면접 진행을 막지 않음)
        ④-A 의 rubric_results 를 그대로 실어 보내면 좋음 → ai_answer 생성 후 저장

⑤ (반복) all_passed=true 가 나올 때까지, 또는 꼬리질문 횟수 상한(capped=true)까지 ④ 반복
   → all_passed=true 가 되면 다음 기본 질문으로 넘어가 ④부터 반복

⑥ 면접 종료 후 "전체 총평/피드백" 리포트 — 아직 미구현 (remaining_work.md 참고)
```

---

## 2. 헬스체크

### `GET /` , `GET /health`

| 항목 | 내용 |
|---|---|
| 호출 시점 | 컨테이너 오케스트레이션/로드밸런서의 생존 확인용. 면접 로직과 무관 |
| 인증 | 없음 |
| 요청 파라미터 | 없음 |
| 응답 | `{"status": "ok"}` |
| 에러 케이스 | 없음(프로세스가 죽어있으면 연결 자체가 실패) |

---

## 3. 임베딩 — 개인 문서 (이력서/자소서/GitHub)

### 3.1 `POST /api/v1/embeddings`

| 항목 | 내용 |
|---|---|
| 호출 시점 | BE가 `analyses` 테이블에 이력서/자소서/GitHub 분석 결과를 저장한 직후 |
| 호출 방식 | 동기 (임베딩 완료까지 응답 대기, 보통 짧게 끝남) |
| 담당 서비스 | `services/embedding_service.py` → `db/chroma.py` (user_documents 컬렉션) |

**요청 바디** (`EmbedRequest`)

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `user_id` | int | ✅ | `users.id` |
| `items` | `EmbeddingItem[]` | ✅ (최소 1개) | 임베딩할 문서 목록 |
| `items[].doc_type` | enum(`resume`\|`cover_letter`\|`github`) | ✅ | 문서 출처. `analyses.type` 과 매핑 |
| `items[].target_id` | int | ✅ | 원본 테이블 PK (`analyses.target_id`) |
| `items[].content` | string | ✅ | 분석 결과 텍스트 (`analyses.content`) |
| `items[].title` | string \| null | ❌ | 문서 제목/레포명/회사명 (검색 결과 표시용) |
| `replace` | bool | ❌ (기본 `true`) | true면 해당 `user_id`의 기존 임베딩을 지우고 재삽입 (재분석 시 중복 방지) |

**응답** (`EmbedResponse`, 200)

| 필드 | 타입 | 설명 |
|---|---|---|
| `user_id` | int | 요청과 동일 |
| `embedded_count` | int | 실제 저장된 문서(analyses 행) 개수 |
| `chunk_count` | int | 문단 단위로 분할된 청크 총 개수 |
| `message` | string | 고정 메시지 |

**에러**

| 상태 코드 | 상황 |
|---|---|
| 400 | `items[]`의 모든 `content`가 빈 문자열이라 임베딩할 게 없음 |
| 500 | Chroma/임베딩 모델 내부 오류 |

**BE 연동 메모**: 이 API 호출 결과 자체는 BE가 별도로 저장할 필요 없다(성공 여부만
확인하면 됨). 실제 데이터는 AI 서비스의 Chroma 볼륨에 저장되고, `user_id`로만 다시
꺼내 쓸 수 있다.

### 3.2 `DELETE /api/v1/embeddings/{user_id}`

| 항목 | 내용 |
|---|---|
| 호출 시점 | 사용자 탈퇴, 또는 문서 자체 삭제 시 |
| 호출 방식 | 동기 |

**경로 파라미터**: `user_id` (int, 필수)

**응답** (`DeleteEmbeddingResponse`, 200)

| 필드 | 타입 | 설명 |
|---|---|---|
| `user_id` | int | 요청과 동일 |
| `deleted` | bool | 항상 `true` (삭제 대상이 없어도 에러 아님 — 멱등) |
| `message` | string | 고정 메시지 |

**에러**: 500 (Chroma 내부 오류)만 존재.

---

## 4. CS 전역 지식 — 관리용 (평상시 BE가 호출할 일 거의 없음)

CS 지식은 서버 최초 기동 시 `data/cs_knowledge.json` 시드 파일로 자동 채워진다
(`main.py` lifespan 훅). 아래 API는 **CS 지식 원본이 갱신되어 전량 재구축이 필요할 때만**
운영자/BE가 수동으로 호출하는 관리용 엔드포인트다. 개인 문서와 달리 `user_id`가 없다
(모든 사용자가 공유하는 전역 데이터이기 때문).

### 4.1 `POST /api/v1/cs-knowledge`

**요청 바디** (`CSEmbedRequest`)

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `items` | `CSKnowledgeItem[]` | ✅ (최소 1개) | CS 지식 목록 |
| `items[].category` | string | ✅ | 대분류 (예: 운영체제, 네트워크, 데이터베이스) |
| `items[].concept` | string | ✅ | 개념명 (예: 프로세스와 스레드) |
| `items[].content` | string | ✅ | 개념 설명 본문 (실제 임베딩 대상) |
| `replace` | bool | ❌ (기본 `false`) | true면 CS 지식 컬렉션 전체를 비우고 재삽입 |

**응답** (`CSEmbedResponse`, 200)

| 필드 | 타입 | 설명 |
|---|---|---|
| `embedded_count` | int | 저장된 개념(concept) 수 |
| `chunk_count` | int | 분할된 청크 총 개수 |
| `total_in_collection` | int | 현재 CS 지식 컬렉션의 전체 청크 수(누적) |
| `message` | string | 고정 메시지 |

**에러**: 400(유효 항목 없음), 500(내부 오류)

### 4.2 `DELETE /api/v1/cs-knowledge`

경로/쿼리 파라미터 없음 — 컬렉션 전체 삭제. 응답: `CSDeleteResponse { deleted, message }`.

---

## 5. 면접 — 핵심 흐름 (질문 생성 / 꼬리질문 / 답변 보완)

이 3개 엔드포인트가 **루브릭 기반 동적 꼬리질문 아키텍처**의 핵심이다. 셋 다
`schemas/interview.py` 를 공유하며, `rubric` / `rubric_results` 데이터가 요청→응답→다음
요청으로 어떻게 이어지는지가 연동의 핵심이므로 5.4절 "필드 흐름"을 꼭 참고할 것.

### 5.1 `POST /api/v1/interviews/questions` — 질문 + 채점 기준 생성

| 항목 | 내용 |
|---|---|
| 호출 시점 | 면접 시작 시, BE가 `ai_interviews` 세션(row)을 생성한 직후 |
| 호출 방식 | 동기 (RAG 검색 + LLM 호출 포함, 수 초 소요될 수 있음) |
| 담당 서비스 | `services/question_service.py` |

**요청 바디** (`QuestionGenerateRequest`)

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `user_id` | int | ✅ | `users.id` |
| `ai_interview_id` | int | ✅ | `ai_interviews.id` (BE가 세션 생성 후 전달) |
| `interview_type` | enum(`job`\|`cs`\|`tech`\|`portfolio`\|`comprehensive`) | ✅ | 면접 유형 |
| `difficulty` | enum(`easy`\|`normal`\|`hard`) | ❌ (기본 `normal`) | 난이도 |
| `company_name` | string \| null | ❌ | 지원 기업 |
| `position` | string \| null | ❌ | 지원 직무/포지션 |
| `question_count` | int \| null | ❌ | 생성할 질문 수 (미지정 시 서버 기본값 **5**, `config.question_count`) |

**응답** (`QuestionGenerateResponse`, 200)

| 필드 | 타입 | 설명 |
|---|---|---|
| `ai_interview_id` | int | 요청과 동일 |
| `interview_type` | enum | 요청과 동일 |
| `questions` | `GeneratedQuestion[]` | 생성된 질문 목록 |
| `questions[].order` | int | 질문 순서 (1부터) |
| `questions[].question` | string | 질문 내용 |
| `questions[].rubric` | string[] | **이 질문의 채점 기준 목록 (2~3개, `config.rubric_min_count`~`rubric_max_count`)**. `/followup`, `/answers/supplement` 호출 시 그대로 되돌려줘야 함 |
| `questions[].topic` | string \| null | 질문 주제 태그 |
| `questions[].source` | string \| null | 근거가 된 문서 출처(resume/cover_letter/github/general) |
| `rag_used` | bool | RAG 컨텍스트가 실제로 검색되었는지 (신규 가입자 등 문서 없으면 `false`) |

> ⚠️ **`expected_answer` 필드는 존재하지 않는다.** 질문 생성 시점에는 아직 답변이
> 없으므로 사전 예상 답안을 만들지 않는다 — 답변은 사용자가 실제로 제출한 후
> `/answers/supplement` 로 별도 생성된다.

**에러**

| 상태 코드 | 상황 |
|---|---|
| 502 | GMS LLM 호출 실패(`GMSError`) |
| 500 | 그 외 내부 오류 |
| 422 | 요청 바디 유효성 검증 실패 (FastAPI/Pydantic 자동 처리) |

**BE가 반드시 저장해야 할 것**: `questions[]` 전체(특히 `question` + `rubric`)를
세션 상태(Redis Queue 등)에 순서대로 저장. 이후 `/followup`, `/answers/supplement`
호출 시 해당 질문의 `rubric`을 그대로 실어 보내야 한다.

---

### 5.2 `POST /api/v1/interviews/followup` — rubric 채점 + 동적 꼬리질문

| 항목 | 내용 |
|---|---|
| 호출 시점 | 사용자가 (기본 질문이든 꼬리질문이든) 답변을 제출/저장한 직후 |
| 호출 방식 | **동기** — 이 응답으로 BE가 "다음 기본 질문 vs 꼬리질문 제시"를 결정하므로 면접 진행에 필수 |
| 담당 서비스 | `services/followup_service.py` |

**요청 바디** (`FollowupRequest`)

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `user_id` | int | ✅ | `users.id` |
| `ai_interview_id` | int | ✅ | `ai_interviews.id` |
| `parent_question` | string | ✅ | 직전(방금 답변한) 질문 원문 |
| `rubric` | string[] | ✅ (최소 1개) | 채점 대상 rubric 목록. 5.1의 `questions[].rubric`을 그대로 전달. **재꼬리질문인 경우, 아직 통과 못한 rubric 항목만 추려서 전달**하는 것을 전제로 설계됨(이미 통과한 기준 재채점 불필요) |
| `user_answer` | string | ✅ | 사용자 답변 (STT 텍스트) |
| `interview_type` | enum | ✅ | 면접 유형 |
| `followup_depth` | int | ❌ (기본 0) | 현재까지 이 질문에 나간 꼬리질문 횟수. **주 종료 조건이 아니라 무한 반복 방지용 안전장치**(`config.max_followup_per_question`, 기본 2 도달 시 LLM 호출 없이 강제 종료) |

**응답** (`FollowupResponse`, 200)

| 필드 | 타입 | 설명 |
|---|---|---|
| `ai_interview_id` | int | 요청과 동일 |
| `rubric_results` | `RubricResult[]` | rubric 항목별 채점 결과. `capped=true`일 때는 빈 배열 |
| `rubric_results[].criterion` | string | 채점 기준 원문 |
| `rubric_results[].passed` | bool \| null | 충족 여부. `null`은 "채점 안 함"(capped 시에만 발생) |
| `rubric_results[].reason` | string \| null | 판정 근거 한 문장(로깅/디버깅용) |
| `all_passed` | bool | **rubric을 모두 통과했는지 — BE 분기의 핵심 필드.** `true`면 다음 기본 질문으로 진행 |
| `followup_question` | string \| null | 통과 못한 rubric을 겨냥한 꼬리질문. `all_passed=true`면 `null` |
| `followup_depth` | int | 이번 응답 반영 후 누적 꼬리질문 횟수 |
| `capped` | bool | 횟수 상한 도달로 **실제 rubric 채점 없이** 강제 종료했는지. `true`일 때 `all_passed`도 `true`로 채워지지만 "진짜 통과"가 아니라 "더 이상 파고들지 않기로 함"을 의미 — 리포트 등에서 구분해서 다뤄야 함 |

> ⚠️ `expected_answer` 필드는 존재하지 않는다 (5.1과 동일한 이유).

**에러**: 502(GMS 실패), 500(내부 오류), 422(rubric이 빈 배열 등 유효성 실패)

**BE 분기 로직 요약**:
```
response = call /followup(...)
if response.all_passed:
    다음 기본 질문으로 진행 (capped 여부는 로그/리포트용으로만 기록)
else:
    response.followup_question 을 Redis Queue 맨 앞에 끼워넣어 다음 차례로 제시
    (이때 followup_depth 를 그대로 다음 /followup 요청에 실어 보낼 것)
```

---

### 5.3 `POST /api/v1/interviews/answers/supplement` — 답변 보완 (신규)

| 항목 | 내용 |
|---|---|
| 호출 시점 | 사용자가 답변을 DB에 저장한 직후 (기본 질문/꼬리질문 구분 없이 매번) |
| 호출 방식 | **비동기 권장** — 면접 진행(`/followup`)과는 독립적이며, 이 응답을 기다리느라 사용자를 대기시킬 필요가 없다. BE가 백그라운드 스레드/메시지 큐 등에서 호출 |
| 담당 서비스 | `services/answer_service.py` |

**요청 바디** (`AnswerSupplementRequest`)

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `user_id` | int | ✅ | `users.id` |
| `ai_interview_id` | int | ✅ | `ai_interviews.id` |
| `question` | string | ✅ | 사용자가 답변한 질문 원문 (기본 질문 또는 꼬리질문) |
| `rubric` | string[] | ❌ (기본 `[]`) | 이 질문의 채점 기준. 참고 자료로만 사용(있으면 보완 시 반영) |
| `rubric_results` | `RubricResult[]` \| null | ❌ | **`/followup` 응답을 그대로 전달 권장.** 이미 채점된 결과가 있으면 재채점 없이 "무엇을 놓쳤는지" 바로 알려줘 보완 품질이 좋아짐. 없으면 `null` |
| `user_answer` | string | ✅ | 사용자 답변 (STT 텍스트) |
| `interview_type` | enum | ✅ | 면접 유형 |

**응답** (`AnswerSupplementResponse`, 200)

| 필드 | 타입 | 설명 |
|---|---|---|
| `ai_interview_id` | int | 요청과 동일 |
| `question` | string | 요청과 동일 (여러 비동기 응답이 섞일 때 BE가 어떤 질문에 대한 응답인지 매칭하는 용도) |
| `ai_answer` | string | **사용자 답변을 보완한 AI 답변.** `ai_interview_questions.ai_answer` 컬럼에 저장. LLM 응답이 비정상(빈 문자열 등)이면 사용자 원문 답변으로 자동 폴백되므로 항상 비어있지 않은 문자열이 보장됨 |

**에러**: 502(GMS 실패), 500(내부 오류)

**BE 연동 메모**: 응답의 `ai_answer` 를 받아 `ai_interview_questions.ai_answer` 컬럼에
저장하면 된다. 이 값들은 면접 최종 완료 화면에서 (질문, 사용자 답변, `ai_answer`) 목록으로
노출하는 데 쓰인다. "면접 전체 총평/피드백"은 이 API가 아니라 별도의 미구현 엔드포인트가
담당할 예정(6절 참고).

---

### 5.4 rubric / rubric_results 필드 흐름 (BE 연동 시 가장 헷갈리는 부분)

```
/questions 응답
  questions[i].rubric = ["기준1", "기준2", "기준3"]
        │
        │ BE가 세션 상태에 저장
        ▼
/followup 요청
  rubric = questions[i].rubric   (재꼬리질문이면: 아직 통과 못한 기준만)
        │
        ▼
/followup 응답
  rubric_results = [{criterion, passed, reason}, ...]
  all_passed, followup_question, capped
        │
        │ BE가 그대로 보관
        ▼
/answers/supplement 요청 (비동기)
  rubric = questions[i].rubric        (참고용)
  rubric_results = <바로 위 /followup 응답의 rubric_results>   (선택, 권장)
        │
        ▼
/answers/supplement 응답
  ai_answer  →  ai_interview_questions.ai_answer 컬럼에 저장
```

---

## 6. 아직 없는 엔드포인트

면접 종료 후 "전체 대화를 아우르는 총평/피드백"을 생성하는 엔드포인트(가칭
`POST /api/v1/interviews/report`)는 **아직 구현되지 않았다.**
자세한 설계 방향은 [`AI_작업일지_0722.md`](./AI_작업일지_0722.md)의
2절 참고.

---

## 7. 관련 설정값 (`.env`)

BE 연동 시 참고할 서버 기본값(`config.py`). BE가 요청 파라미터로 오버라이드하지 않으면
아래 값이 적용된다.

| 설정 | 기본값 | 환경변수 | 영향받는 엔드포인트 |
|---|---|---|---|
| 질문 개수 | 5 | `QUESTION_COUNT` | `/questions` (`question_count` 미지정 시) |
| rubric 개수 범위 | 2~3 | `RUBRIC_MIN_COUNT` / `RUBRIC_MAX_COUNT` | `/questions` |
| 꼬리질문 횟수 상한(안전장치) | 2 | `MAX_FOLLOWUP_PER_QUESTION` | `/followup` (`followup_depth` 도달 시 `capped=true`) |
| RAG top-k (개인 문서) | 5 | `RAG_TOP_K` | `/questions`, `/followup`, `/answers/supplement` |
| RAG top-k (CS 지식) | 4 | `CS_TOP_K` | `/questions` (cs/comprehensive 면접 시) |
