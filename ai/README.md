# AI 모의 면접 - FastAPI

이력서/자소서/GitHub 분석 텍스트를 **Chroma DB**에 임베딩해두고, 면접 진행 중 **RAG**로
관련 문서를 검색해 **GMS(SSAFY GMS 게이트웨이) LLM**으로 면접 질문·채점 기준(rubric)·
동적 꼬리질문을 생성하는 백엔드 API 서버.

## 디렉토리 구조

```
ai/
├── main.py                    # FastAPI 엔트리포인트, lifespan(임베딩 모델/Chroma 컬렉션 프리로딩 + CS 지식 자동 시딩)
├── config.py                   # .env 기반 설정 (Settings, pydantic-settings)
├── requirements.txt
├── Dockerfile / docker-compose.yml / .env.example / .dockerignore
├── data/cs_knowledge.json      # CS 지식 시드 데이터 (gyoogle 레포 기반, 289 청크)
├── cs_knowledge_dataset.md     # 위 시드 데이터 생성 경위 문서
├── docs/                       # 작업일지/개발일지/인터페이스 명세 등 참고 문서
├── core/
│   └── gms_client.py             # GMS(OpenAI 호환) LLM 클라이언트 — 재시도(tenacity) + JSON 방어 파싱
├── db/
│   └── chroma.py                  # Chroma PersistentClient + 임베딩 함수 + 컬렉션 2개(user_documents/cs_knowledge) 관리(싱글턴)
├── schemas/
│   ├── common.py                    # InterviewType/DocType/Difficulty/InterviewerStyle/CSCategory enum + BE 한글 wire 값 매핑
│   ├── embedding.py                  # 개인 문서 임베딩 저장/전체삭제/문서단위삭제 요청·응답
│   ├── cs_knowledge.py                # CS 지식 임베딩 요청·응답
│   ├── interview.py                   # 질문 생성 / 꼬리질문 요청·응답
│   └── analysis_document.py           # BE가 보내는 구조화 분석 문서(JSON 문자열) 내부 파싱 모델
├── prompts/
│   └── templates.py                # 질문 생성 / 꼬리질문 프롬프트 빌더
├── services/
│   ├── embedding_service.py         # 청킹 + Chroma 저장/삭제 (개인 문서, 평문·구조화 포맷 자동 판별)
│   ├── cs_embedding_service.py       # CS 지식 청킹 + Chroma 저장 + 서버 기동 시 자동 시딩
│   ├── rag_service.py                # 유사도 검색, 면접 유형별 문서 참고 비율 배분, CS 카테고리 하드 필터
│   ├── question_service.py           # RAG + GMS로 질문/rubric 생성
│   └── followup_service.py           # rubric narrowing 채점 + 동적 꼬리질문 생성 (LLM 1회 호출)
├── routers/
│   ├── health.py                   # 헬스체크
│   ├── embedding.py                 # 개인 문서 임베딩 저장/삭제
│   ├── interview.py                  # 질문 생성 / 꼬리질문
│   └── cs_knowledge.py                # CS 지식 임베딩 관리(전량 재구축용)
└── tests/
    └── test_followup_service.py     # followup_service narrowing 로직 단위 테스트 (unittest, 외부 의존성 모킹)
```

> `services/answer_service.py`(답변 보완)는 존재하지 않는다 — 답변 분석/보완/평가는 Spring Boot(BE)가 담당한다.

## 핵심 기술 스택

| 구분 | 내용 |
|---|---|
| 웹 프레임워크 | FastAPI 0.115.0 + uvicorn |
| 데이터 검증 | pydantic 2.9.2 / pydantic-settings 2.5.2 |
| HTTP 클라이언트 | httpx 0.27.2 (async) |
| 벡터 DB | chromadb 0.5.5 (PersistentClient, cosine 거리) |
| 임베딩 모델 | sentence-transformers 3.1.1 + `jhgan/ko-sroberta-multitask` (한국어) |
| LLM | GMS 게이트웨이(OpenAI 호환 Chat Completions), 기본 모델 `gpt-5.4-mini`(`config.py`/`.env.example` 기본값, `GMS_MODEL`로 변경 가능) |
| 재시도 | tenacity 9.0.0 (GMS 5xx/네트워크 오류만 최대 3회 지수 백오프) |

## 핵심 기능

- **개인 문서 임베딩**: 이력서/자소서/GitHub 분석 텍스트를 청킹해 Chroma(`user_documents`)에 저장. 평문 텍스트와 BE의 구조화 분석 문서(JSON) 포맷을 자동 판별해 둘 다 지원.
- **RAG 기반 질문 생성**: 면접 시작 시 개인 문서를 검색해 GMS LLM으로 질문 + 질문별 rubric(채점 기준)을 생성. 면접 유형별로 이력서/자소서/GitHub 참고 비율(`DOC_TYPE_WEIGHTS`)을 다르게 배분.
- **CS 카테고리 제한 검색**: CS 면접은 사용자가 고른 CS 카테고리(9종) 범위로 Chroma 검색을 하드 필터링. 개인 문서가 해당 카테고리와 무관하면(코사인 거리 임계값 초과) 카테고리 내 CS 지식에서 무작위로 뽑아 대체.
- **rubric narrowing 기반 동적 꼬리질문**: 답변 제출 시 LLM 1회 호출로 미통과 rubric만 추려 응답에 남기고, 그중 하나를 겨냥한 꼬리질문을 생성. 통과한 rubric은 응답에서 제거되어 재채점 진동을 구조적으로 방지.
- **CS 지식 관리**: `data/cs_knowledge.json`(gyoogle 레포 기반, 289 청크) 시드를 서버 최초 기동 시 컬렉션이 비어있으면 자동 임베딩. 원본 갱신 시에만 관리용 API로 수동 재구축.

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/`, `/health` | 헬스체크 (외부 의존성 호출 없이 즉시 응답) |
| POST | `/api/v1/embeddings` | 개인 문서(이력서/자소서/GitHub) 임베딩 저장. `replace=true`면 해당 문서 기존 임베딩 삭제 후 재삽입 |
| DELETE | `/api/v1/embeddings/{user_id}` | 사용자 전체 임베딩 삭제 (회원 탈퇴용, 멱등) |
| POST | `/api/v1/embeddings/delete` | 문서 단위(자소서/GitHub 레포 1건) 임베딩 삭제 (멱등) |
| POST | `/api/v1/interviews/questions` | 면접 질문 + rubric 생성 (RAG + GMS) |
| POST | `/api/v1/interviews/followup` | 답변 기반 rubric narrowing 채점 + 동적 꼬리질문 생성 |
| POST | `/api/v1/cs-knowledge` | CS 전역 지식 임베딩 (관리용, `replace=true`면 전량 재구축) |
| DELETE | `/api/v1/cs-knowledge` | CS 전역 지식 컬렉션 전체 삭제 (관리용) |

## 주요 설정값 (`.env` / `config.py`)

| 항목 | 기본값(config.py) | 환경변수 |
|---|---|---|
| GMS 모델 | `gpt-5.4-mini` | `GMS_MODEL` |
| 임베딩 모델 | `jhgan/ko-sroberta-multitask` | `EMBEDDING_MODEL` |
| 질문 개수 | 5 | `QUESTION_COUNT` |
| 질문당 rubric 개수 | 2~3 | `RUBRIC_MIN_COUNT` / `RUBRIC_MAX_COUNT` |
| 질문당 꼬리질문 최대(안전장치) | 2 | `MAX_FOLLOWUP_PER_QUESTION` |
| 개인 문서 RAG top-k | 5 | `RAG_TOP_K` |
| CS 지식 RAG top-k | 4 | (`.env.example`에 미등록, 코드 기본값만 사용) |
| CS 카테고리-개인 문서 관련도 임계값(코사인 거리) | 0.45 | (`.env.example`에 미등록, 코드 기본값만 사용) |

> ⚠️ `services/question_service.py`의 `generate_questions()`는 현재 `count = 7`로 하드코딩되어 있어, 위 표의 `question_count` 기본값(5)과 요청의 `question_count` 필드를 실제로는 무시하고 항상 질문 7개를 생성한다.

## 실행 방법

```bash
cp .env.example .env      # GMS_KEY 등 입력
docker compose up --build
# → http://localhost:8000/docs (Swagger)
```

`docker-compose.yml`은 `chroma_data`(Chroma 영속 데이터)와 `hf_cache`(임베딩 모델 캐시)를
named volume으로 마운트해 컨테이너 재시작 후에도 유지한다. `Dockerfile`은 빌드 시점에
`EMBEDDING_MODEL`(기본 `jhgan/ko-sroberta-multitask`)을 미리 다운로드해 첫 요청 지연을 방지한다.
