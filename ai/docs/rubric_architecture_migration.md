# 루브릭 기반 동적 꼬리질문 아키텍처 전환 — 작업 보고서 (Phase 1 + Phase 2 + 답변 보완 재설계)

> 브랜치: `ai/feature/LLM_Question_Rubric`
> 범위: **Phase 1(질문 + 루브릭 생성)**, **Phase 2(실시간 채점 + 꼬리질문 One-Call 생성)**,
> 그리고 기존 계획에서 **재설계된 "답변 보완"** (사용자가 답변을 제출할 때마다 비동기로
> AI 보완 답변을 생성하는 신규 플로우)까지 구현했다. "면접 전체에 대한 총평/피드백"을
> 만드는 최종 리포트 엔드포인트는 아직 착수하지 않았으며, 남은 작업은
> [`rubric_architecture_remaining_work.md`](./rubric_architecture_remaining_work.md) 에 정리했다.

---

## 1. 무엇을 했는가 (요약)

### Phase 1 — 질문 + 루브릭 생성
기존 질문 생성 로직은 "면접 질문 N개 + 예상 답안"만 생성했다. 여기에 **질문마다
채점 기준(rubric) 2~3개를 함께 생성**하도록 바꿨다. 질문 개수도 10개 → 5개로
줄였다(정적으로 많이 만들어두는 대신, 답변 품질에 따라 동적으로 깊이를 확보하는
쪽으로 전략을 바꿨기 때문).

### Phase 2 — 실시간 채점 + 동적 꼬리질문
기존 꼬리질문 로직은 "꼬리질문이 필요한가?"를 LLM이 애매하게(`need_followup` bool)
판단하고, `followup_depth` 카운터로만 종료를 제어했다. 이번 작업에서 이를 rubric
기반 채점으로 전면 교체했다:
- BE가 Phase 1에서 받은 rubric을 답변과 함께 `/followup`에 넘기면,
- LLM 1회 호출(One-Call JSON Mode)로 **rubric 항목별 pass/fail 채점**과
  **통과 못한 항목을 겨냥한 꼬리질문 생성**을 동시에 수행한다.
- 종료 조건이 "카운터 소진"에서 "**rubric을 실제로 다 통과했는가(`all_passed`)**"로
  바뀌었다. 다만 rubric이 계속 통과되지 못해 대화가 무한정 이어지는 것을 막기 위해,
  `followup_depth`를 **안전장치용 상한 체크**로만 남겨뒀다(주 종료 조건은 아님).

### 답변 보완 재설계 — `expected_answer` 폐기 → 답변 제출 후 비동기 `ai_answer` 생성 (신규)
원래 계획(Phase 3)은 "면접 종료 후 전체 대화 기록을 한 번에 처리해 모범 답안을
만드는" 방식이었다. 작업 중 **설계를 다시 논의**해 다음과 같이 바꿨다:
- `GeneratedQuestion.expected_answer`, `FollowupResponse.expected_answer` — 질문/꼬리질문을
  "만들 때" 미리 써두던 예상 답안 필드를 **완전히 제거**했다. 질문 생성 시점에는
  아직 사용자가 답하지 않았으므로, 미리 만든 답을 보여주는 것 자체가 개념적으로
  맞지 않다고 판단.
- 대신 `ai_interview_questions.ai_answer` 컬럼의 의미를 **"사용자가 실제로 제출한
  답변을 AI가 보완한 결과"**로 재정의했다. 이 값은 사용자가 답변을 제출한 직후
  **백그라운드에서 비동기로** 신규 엔드포인트(`POST /api/v1/interviews/answers/supplement`)를
  호출해 채워진다 — 기본 질문 답변이든 꼬리질문 답변이든 구분 없이 매번 호출된다.
  Phase 2에서 이미 rubric 채점을 했다면 그 결과(`rubric_results`)를 함께 넘겨,
  "정확히 어떤 기준을 놓쳤는지" 알고 보완하도록 설계했다(재채점 불필요).
- 이 데이터(질문, 사용자 답변, `ai_answer`)는 **면접 최종 완료 화면**에서 지원자에게
  "전반적인 분석/피드백"과 함께 노출하는 데 쓰일 예정이다. "전반적인 분석/피드백"
  자체(면접 전체를 아우르는 총평)는 이번 작업 범위가 아니며 별도 엔드포인트로
  남아있다(2절 참고).

세 가지 변경 모두 엔드포인트 URL(`/api/v1/interviews/questions`, `/followup`)은
유지했고, `/answers/supplement`만 신규 추가했다. Phase 1은 필드 추가 위주라 하위
호환이 유지되지만, **Phase 2(`FollowupRequest`/`FollowupResponse`)와 답변 보완 재설계
(`expected_answer` 제거)는 기존 BE 연동을 깨는 Breaking Change**다(4절 참고).

기존 RAG 파이프라인(`rag_service.py`), 임베딩 서비스, Chroma DB 연동은 전혀
건드리지 않았다.

---

## 2. 전체 코드 흐름 (요청 → 응답)

### 2.1 Phase 1 — 질문 생성 (`POST /api/v1/interviews/questions`)

```
[BE: Spring Boot]
   │  POST /api/v1/interviews/questions
   │  { user_id, ai_interview_id, interview_type, difficulty,
   │    company_name?, position?, question_count? }
   ▼
[routers/interview.py] create_questions()
   │  - services.question_service.generate_questions() 에 위임
   │  - GMSError / 기타 예외를 HTTP 502 / 500 으로 변환
   ▼
[services/question_service.py] generate_questions()
   │  1) count = req.question_count or settings.question_count  (기본 5개)
   │  2) _build_rag_query() 로 검색 쿼리 문자열 구성
   │  3) rag_service.retrieve_context() 로 사용자 개인 문서 검색
   │     (CS/종합 면접이면 retrieve_cs_knowledge() 로 CS 전역 지식도 추가 검색)
   │  4) format_context() 로 검색 결과를 프롬프트용 텍스트로 정리
   │  5) build_question_prompt() 로 최종 프롬프트 생성
   │     - rubric_min_count/rubric_max_count(기본 2~3) 를 프롬프트에 전달
   │     - "질문마다 rubric을 N~M개 작성하라"는 지시문과 출력 예시 포함
   │     - "expected_answer는 생성하지 말라"는 지시 포함 (답변 보완 재설계)
   │  6) gms_client.chat_json(QUESTION_SYSTEM, prompt) 로 GMS LLM 호출
   │  7) 응답 JSON의 questions[] 를 GeneratedQuestion 객체로 정규화
   │     - rubric 필드: 비문자열/빈 문자열 제거, rubric_max_count 초과분 트리밍
   │     - expected_answer 는 파싱하지 않음(스키마에서 필드 자체가 제거됨)
   │     - order 재정렬
   │  8) rubric이 비어있는 질문 수를 로그로 남김 (모니터링용)
   ▼
[routers/interview.py] → QuestionGenerateResponse 반환
   │  { ai_interview_id, interview_type,
   │    questions: [ { order, question, rubric: [...], topic, source }, ... ],
   │    rag_used }
   ▼
[BE: Spring Boot]
   - 질문 + rubric 을 세션 상태(예: Redis Queue)에 저장
   - 사용자가 답변을 제출할 때마다 해당 질문의 rubric 을 /followup 호출 시 함께 전달
```

### 2.2 Phase 2 — 꼬리질문 채점/생성 (`POST /api/v1/interviews/followup`)

```
[BE: Spring Boot]
   │  POST /api/v1/interviews/followup
   │  { user_id, ai_interview_id, parent_question, rubric: [...],
   │    user_answer, interview_type, followup_depth }
   │  ※ rubric 은 Phase 1 에서 BE가 저장해둔 해당 질문의 rubric.
   │    재꼬리질문인 경우, 아직 통과 못한 rubric 항목만 추려 넘기는 것을 전제로 함.
   ▼
[routers/interview.py] create_followup()
   │  - services.followup_service.generate_followup() 에 위임
   ▼
[services/followup_service.py] generate_followup()
   │  1) 안전장치 체크: followup_depth >= max_followup_per_question(기본 2) 이면
   │     LLM 호출 없이 즉시 종료 → all_passed=true, capped=true, rubric_results=[]
   │     (rubric을 실제로 채점하지 않았다는 뜻이므로 "진짜 통과"와 구분됨)
   │  2) query = f"{parent_question} {user_answer}" 로 RAG 재검색(top_k=3, 근거 보강)
   │  3) build_followup_prompt() 로 프롬프트 생성
   │     - rubric 목록을 번호 매겨 그대로 노출
   │     - "rubric 항목별 채점 + 통과 못한 항목 중 1개를 겨냥한 꼬리질문 생성" 지시
   │     - "꼬리질문의 expected_answer는 생성하지 말라"는 지시 포함 (답변 보완 재설계)
   │  4) gms_client.chat_json(FOLLOWUP_SYSTEM, prompt) 로 GMS LLM 1회 호출
   │     (rubric 채점 + 꼬리질문 생성을 한 번에 처리 = One-Call JSON Mode)
   │  5) rubric_results 파싱 & 정규화
   │     - LLM이 criterion 문구를 누락하면 입력 rubric의 같은 순번 항목으로 보정
   │     - passed 는 bool 로 강제 캐스팅
   │  6) all_passed 서버 측 재계산: rubric_results 가 모두 passed=true 일 때만 true
   │     (LLM이 보낸 all_passed 플래그를 그대로 신뢰하지 않고 재검증)
   │  7) 방어 처리: all_passed=false 인데 followup_question 이 비어있으면
   │     교착 상태를 막기 위해 all_passed=true 로 강제 전환
   │  8) followup_depth 갱신: 실제로 꼬리질문이 나간 경우에만 +1
   ▼
[routers/interview.py] → FollowupResponse 반환
   │  { ai_interview_id, rubric_results: [{criterion, passed, reason}, ...],
   │    all_passed, followup_question, followup_depth, capped }
   ▼
[BE: Spring Boot]
   - all_passed=true  → 다음 기본 질문으로 진행
   - all_passed=false → followup_question 을 Redis Queue 맨 앞에 끼워넣어 다음 차례로 제시
   - capped=true 인 경우는 "rubric을 다 통과해서"가 아니라 "횟수 상한이라 강제 종료"이므로
     리포트 등에서 구분해서 다뤄야 함
   - (질문/꼬리질문과 무관하게) 답변을 저장한 직후, 아래 2.3 을 비동기로 트리거
```

### 2.3 답변 보완 (신규) — `POST /api/v1/interviews/answers/supplement`

```
[BE: Spring Boot]
   │  사용자 답변을 DB(user_answer)에 저장한 직후, 면접 진행(2.2)과는 별개로
   │  백그라운드 작업에서 비동기 호출 (동기 응답을 기다리지 않음)
   │
   │  POST /api/v1/interviews/answers/supplement
   │  { user_id, ai_interview_id, question, rubric: [...],
   │    rubric_results?: [...], user_answer, interview_type }
   │  ※ rubric_results 는 2.2 에서 이미 채점했다면 그 결과를 그대로 실어 보낸다(선택).
   ▼
[routers/interview.py] create_answer_supplement()
   │  - services.answer_service.generate_answer_supplement() 에 위임
   ▼
[services/answer_service.py] generate_answer_supplement()
   │  1) query = f"{question} {user_answer}" 로 RAG 검색(top_k=3, 근거 보강)
   │  2) req.rubric_results(있으면) 를 dict 리스트로 변환
   │  3) build_answer_supplement_prompt() 로 프롬프트 생성
   │     - rubric_results 가 있으면: "이미 판정된 결과" 형태로 통과/미통과 항목을 그대로 제시
   │       (재채점 불필요, 미통과 항목만 겨냥해 보완)
   │     - rubric_results 가 없고 rubric만 있으면: rubric을 참고 자료로만 제시
   │     - 둘 다 없으면: 일반적인 답변 품질 기준으로 보완
   │     - "지원자 답변을 존중하며 자연스럽게 보완, 새 답변을 지어내지 말 것" 지시
   │  4) gms_client.chat_json(ANSWER_SUPPLEMENT_SYSTEM, prompt) 로 GMS LLM 호출
   │  5) ai_answer 파싱. 비어있으면 사용자 원문 답변으로 폴백(화면 깨짐 방지)
   ▼
[routers/interview.py] → AnswerSupplementResponse 반환
   │  { ai_interview_id, question, ai_answer }
   ▼
[BE: Spring Boot]
   - ai_interview_questions.ai_answer 컬럼에 저장
   - 면접 최종 완료 화면에서 (질문, 사용자 답변, ai_answer) 목록 + 전반적 분석/피드백과
     함께 노출 ("전반적 분석/피드백" 생성 자체는 별도 미구현 엔드포인트, remaining_work.md 참고)
```

---

## 3. 수정한 파일 상세 설명

### 3.1 `ai/config.py`

- `question_count: int = 10` → `5` 로 변경.
- `rubric_min_count: int = 2`, `rubric_max_count: int = 3` 신규 추가.
- `max_followup_per_question: int = 2` (기존 값, 그대로 유지).
  - **[Phase 2에서 역할 변경]** 기존에는 "종료 판단의 주 기준"이었지만, 이제는
    rubric이 계속 통과되지 못할 때의 **안전장치용 상한**으로 역할이 바뀌었다.

### 3.2 `ai/schemas/interview.py`

**Phase 1**
- `GeneratedQuestion` 에 `rubric: list[str]` 필드 추가.
- `GeneratedQuestion.expected_answer` **필드 제거** (답변 보완 재설계).
  기존에는 `ai_interview_questions.ai_answer` 컬럼에 매핑되는 "사전 예상 답안"이었지만,
  이제 그 컬럼은 답변 제출 후 비동기로 생성되는 값이므로 질문 생성 응답에 담을 값이 없다.
- `QuestionGenerateRequest.question_count` 설명 문구를 "기본값 10" → "기본값 5"로 수정.

**Phase 2 (Breaking Change)**
- `RubricResult` 모델 신규 추가: `criterion`(str), `passed`(bool | None — None은
  capped로 인해 채점 자체를 생략한 경우), `reason`(str | None, 판정 근거).
- `FollowupRequest`: `rubric: list[str]` 추가, `followup_depth`는 안전장치 상한 체크
  전용으로 의미 축소(필드는 유지).
- `FollowupResponse` (기존 `need_followup`/`question`/`reason` 제거):
  `rubric_results`, `all_passed`, `followup_question`(이름 변경), `capped` 추가.
- `FollowupResponse.expected_answer` **필드 제거** (답변 보완 재설계) — 꼬리질문
  생성 시점에도 더 이상 사전 예상 답안을 만들지 않는다.

**답변 보완 재설계 (신규)**
- `AnswerSupplementRequest` 신규: `user_id`, `ai_interview_id`, `question`,
  `rubric`(참고용), `rubric_results`(Phase 2 결과 재사용, optional), `user_answer`,
  `interview_type`.
- `AnswerSupplementResponse` 신규: `ai_interview_id`, `question`,
  `ai_answer`(`ai_interview_questions.ai_answer` 저장용).

### 3.3 `ai/prompts/templates.py`

**Phase 1**
- `QUESTION_SYSTEM`: "채점 기준 설계자" 역할 문구 추가.
- `build_question_prompt()`: `rubric_min_count`/`rubric_max_count` 파라미터 추가,
  rubric 작성 지시문/JSON 예시 추가, **"expected_answer는 생성하지 말라"는 지시 추가**
  (답변 보완 재설계).

**Phase 2**
- `FOLLOWUP_SYSTEM`: "판단자" → "채점관 + 채점 결과에 근거한 질문 설계자" 역할로 문구 갱신.
- `build_followup_prompt()`: `remaining` 제거, `rubric` 추가, "통과 못한 항목 중 1개만
  겨냥"하도록 지시, JSON 출력에서 **`expected_answer` 제거**(답변 보완 재설계).

**답변 보완 재설계 (신규)**
- `ANSWER_SUPPLEMENT_SYSTEM`, `build_answer_supplement_prompt()` 신규 작성:
  - rubric_results(이미 채점된 결과)가 있으면 통과/미통과 여부를 그대로 프롬프트에
    노출해 "무엇을 놓쳤는지" 재계산 없이 알려준다.
  - "지원자 답변을 존중하며 미충족 부분만 자연스럽게 보강, 새 경험을 지어내지 말 것"을
    핵심 지시로 명시 — "새 모범 답안 생성"이 아니라 "답변 보완"이라는 성격을 지키기 위함.

### 3.4 `ai/services/question_service.py` (Phase 1 + 답변 보완 재설계)

- `build_question_prompt()` 호출 시 rubric 개수 인자 전달, rubric 필드 정규화/로깅.
- `GeneratedQuestion` 생성 시 `expected_answer` 파싱 코드 제거 — LLM이 옛 습관으로
  여전히 `expected_answer`를 보내더라도 무시한다.

### 3.5 `ai/services/followup_service.py` (Phase 2 — 전면 교체 + 답변 보완 재설계)

- "횟수 초과 시 종료"를 "안전장치(capped)"로 재정의.
- rubric 채점 기반 프롬프트로 교체, `rubric_results` 파싱/검증, `all_passed` 서버
  재계산, 교착 상태 방어(`followup_question` 누락 시 `all_passed=true`로 강제 전환).
- `FollowupResponse` 생성 시 `expected_answer` 인자 제거(필드 자체가 스키마에서 사라짐).

### 3.6 `ai/services/answer_service.py` (신규 — 답변 보완 재설계)

- `generate_answer_supplement()`:
  1. 질문+답변으로 RAG 재검색(top_k=3).
  2. `req.rubric_results`(Phase 2 채점 결과, optional)를 dict로 변환해 프롬프트에 전달.
  3. `build_answer_supplement_prompt()` + `gms_client.chat_json()` 호출
     (temperature=0.6 — 사실 보완 성격이 강해 다른 서비스보다 낮게 설정).
  4. `ai_answer`가 빈 문자열로 오면(LLM 형식 오류 등) 사용자 원문 답변을 그대로
     폴백으로 사용 — 최종 화면에 빈 값이 노출되는 것을 방지.

### 3.7 `ai/routers/interview.py`

- `create_questions()`, `create_followup()` docstring을 최신 스키마 기준으로 갱신
  (더 이상 "Phase 2는 범위 아님" 같은 stale 문구 없음).
- `create_answer_supplement()` 신규: `POST /answers/supplement` 엔드포인트,
  BE가 답변 저장 직후 비동기로 호출한다는 전제와 `rubric_results` 재사용 방식을
  docstring에 명시.

---

## 4. BE와 반드시 맞춰야 할 사항 (Breaking Change)

1. **`/followup` 요청**: `rubric: list[str]`을 반드시 함께 보내야 한다(없으면 422).
2. **`/followup` 응답**: `need_followup`/`question`/`reason`/`expected_answer`가 사라지고
   `all_passed`/`followup_question`/`rubric_results`/`capped`로 대체되었다.
   BE의 분기 로직도 `if not response.all_passed: ...` 형태로 함께 수정해야 한다.
3. **`/questions` 응답**: `expected_answer` 필드가 더 이상 내려오지 않는다. BE가
   기존에 이 값을 `ai_interview_questions.ai_answer`에 즉시 저장하고 있었다면,
   그 로직을 제거하고 대신 답변 제출 후 `/answers/supplement` 호출 결과로 채우도록
   바꿔야 한다.
4. **신규 연동 필요**: 사용자가 답변을 제출/저장한 직후, `POST
   /api/v1/interviews/answers/supplement`를 (기본 질문/꼬리질문 구분 없이) 비동기로
   호출하는 백그라운드 트리거를 BE에 추가해야 한다. 이 호출 없이는 `ai_answer`가
   영구히 비어있게 된다.
5. **capped 처리**: `capped=true`인 응답은 리포트/통계에서 "완전히 통과한 질문"과
   구분해서 다루는 것을 권장한다.

---

## 5. 건드리지 않은 파일 (의도적으로 제외)

- `services/embedding_service.py`, `services/rag_service.py`,
  `services/cs_embedding_service.py`, `db/chroma.py`
  → 이번 아키텍처 변경과 무관하며, 지시사항에서도 명시적으로 제외 대상으로 지정됨.
- "면접 전체 총평/피드백" 생성용 리포트 엔드포인트(신규 예정)
  → 아직 착수하지 않음. 자세한 내용은
  [`rubric_architecture_remaining_work.md`](./rubric_architecture_remaining_work.md) 참고.

---

## 6. 검증

- 변경/신규 7개 파일(`config.py`, `schemas/interview.py`, `prompts/templates.py`,
  `services/question_service.py`, `services/followup_service.py`,
  `services/answer_service.py`, `routers/interview.py`) 모두 `python -m py_compile`
  로 문법 오류 없음을 확인.
- `ai/README.md`의 API 문서(2~5절)를 새 스키마/엔드포인트 기준으로 갱신.
- 실제 GMS LLM 호출을 통한 통합 테스트는 수행하지 않음(별도 `.env`의 GMS 키 필요).
  BE/QA 단계에서 다음을 확인해야 한다:
  - `/api/v1/interviews/questions` 응답에 `expected_answer`가 더 이상 없고,
    `questions[].rubric`이 2~3개의 문자열 배열로 채워지는지.
  - `/api/v1/interviews/followup` 응답의 `rubric_results` 개수가 요청 `rubric`
    개수와 일치하는지, `all_passed=false`일 때 `followup_question`이 항상
    채워지는지, `followup_depth`가 상한에 도달했을 때 `capped=true`로 종료되는지.
  - `/api/v1/interviews/answers/supplement` 호출 시 `ai_answer`가 항상 비어있지
    않은 문자열로 채워지는지(폴백 동작 포함), `rubric_results`를 넘겼을 때와
    안 넘겼을 때 응답 품질 차이를 확인.
