# CS 지식 데이터셋 (cs_knowledge.json) 생성 문서

AI 모의 면접관 시스템의 Chroma DB `cs_knowledge` 컬렉션에 임베딩할 CS 전역 지식 시드 데이터셋 생성 내역을 정리한 문서입니다.

## 1. 개요

- **결과물**: `cs_knowledge.json` (최상단 폴더)
- **원본**: [gyoogle/tech-interview-for-developer](https://github.com/gyoogle/tech-interview-for-developer) (로컬 clone)
- **총 레코드 수**: 131건 (스캔 133개 md → 150자 미만 2건 제외)
- **인코딩**: UTF-8, `ensure_ascii=False`, `indent=2` (한글 그대로 저장)

## 2. 스키마

기존 코드베이스 `ai/schemas/cs_knowledge.py`의 `CSKnowledgeItem`에 정의된 3개 필드를 그대로 따릅니다. 서버 기동 시 `ai/services/cs_embedding_service.py`의 `seed_cs_knowledge_if_empty()`가 읽는 시드 JSON 형식(`[{"category","concept","content"}, ...]`)과 일치합니다.

| 필드 | 타입 | 매핑 규칙 |
|------|------|-----------|
| `category` | str | 원본 상위 폴더 경로 (예: `Computer Science > Network`) |
| `concept` | str | 파일명에서 확장자 제거 (README.md는 상위 폴더명 사용) |
| `content` | str | 전처리된 본문 (실제 임베딩 대상) |

관련 설정 (참고, `ai/config.py`):

- 컬렉션: `cs_knowledge` (cosine 거리)
- 임베딩 모델: `jhgan/ko-sroberta-multitask`
- 메타데이터: `{category, concept, chunk_index}` (임베딩 시 서비스가 부여)

## 3. 포함 / 제외 범위

**포함**

- `Algorithm/`
- `Computer Science/` (Computer Architecture, Data Structure, Database, Network, Operating System, Software Engineering 전체)
- `Design Pattern/`
- `Web/` (Spring, Vue, React, DevOps 하위 폴더 포함)
- `New Technology/AI/README.md`

**제외**

- `Linux/`, `Seminar/`, `ETC/`
- `New Technology/`의 IT Issues·Big Data (2019~2020 시사 이슈, 시의성 없음)
- `Interview/` (질문 목록이라 지식 문서가 아님)
- `.pdf` 등 md가 아닌 파일
- `Language/` — 지시된 포함 범위 목록에 없어 제외
- `New Technology/AI/Linear regression 실습.md` — README.md만 포함하라는 기준에 따라 제외

## 4. 전처리 파이프라인

원본 md를 아래 순서로 정제합니다. 코드는 임베딩 노이즈가 되므로 전부 제거하고, 기술 용어 보존을 위해 인라인 백틱은 기호만 벗겨냅니다.

1. 개행 정규화 및 BOM/제로폭 문자 제거
2. 코드 블록 제거 — ``` 펜스, ~~~ 펜스, 4칸 들여쓰기 코드블록 전부
3. 이미지 마크다운 제거, 링크는 텍스트만 남김 (`[텍스트](url)` → `텍스트`, 중첩 대괄호 포함)
4. HTML 태그 제거 (`<img>`, `<br>` 등)
5. 인라인 백틱은 기호만 제거하고 내용 보존 (TCP, mutex 등 용어 유지)
6. 마크다운 장식 제거 — 헤딩 기호, 불릿, 인용(`>`), 순번 마커, 굵게/기울임, 수평선, 표 구분행, 취소선
7. 연속 공백/빈 줄 정리
8. 전처리 후 150자 미만 문서 제외

> 마커가 겹친 경우(`1. ##### 제목`처럼 순번 뒤 헤딩)도 반복 제거로 모두 벗겨냅니다.

## 5. 카테고리별 분포

| 카테고리 | 레코드 수 |
|----------|-----------|
| Algorithm | 17 |
| Algorithm > professional | 1 |
| Computer Science > Computer Architecture | 7 |
| Computer Science > Data Structure | 11 |
| Computer Science > Database | 11 |
| Computer Science > Network | 11 |
| Computer Science > Operating System | 16 |
| Computer Science > Software Engineering | 10 |
| Design Pattern | 10 |
| New Technology > AI | 1 |
| Web | 19 |
| Web > DevOps | 3 |
| Web > React | 3 |
| Web > Spring | 7 |
| Web > Vue | 4 |
| **합계** | **131** |

## 6. 제외된 파일 (150자 미만)

| 파일 | 전처리 후 길이 | 사유 |
|------|----------------|------|
| `Algorithm/순열 & 조합.md` | 16자 | 본문이 Java 코드 블록뿐 → 코드 제거 후 제목만 남음 |
| `Design Pattern/Design Pattern_Adapter.md` | 143자 | 대부분 코드 블록, 산문이 임계값 미달 |

## 7. 검증 결과

- 전 레코드 `{category, concept, content}` 3필드·전부 문자열 타입
- 잔여 아티팩트 최종 스캔: 백틱·마크다운 링크·HTML 태그·이미지·헤딩·코드 펜스 **모두 0건**
- 코드 블록이 많던 파일(예: Hash Table 구현하기 — 원본 코드 블록 10개)도 코드가 완전히 제거되고 산문만 잔존
- 시드 JSON 형식과 일치 (한글 비이스케이프 저장)

## 8. 배치 위치 (자동 시딩)

`seed_cs_knowledge_if_empty()`는 `settings.cs_seed_path`(기본값 `data/cs_knowledge.json`, 상대 경로)를 읽습니다. Docker 컨테이너의 WORKDIR은 `/app`이고 `docker-compose.yml`이 `.:/app`으로 ai 폴더를 마운트하므로, 런타임 경로 `/app/data/cs_knowledge.json`은 호스트의 **`ai/data/cs_knowledge.json`**에 해당합니다. 즉 이 JSON을 `ai/data/` 폴더에 두면 됩니다 (`data` 폴더는 아직 없으므로 새로 생성). Chroma 볼륨이 비어있는 첫 기동 시 자동 임베딩되고, 이미 데이터가 있으면 스킵됩니다.

## 9. 재생성 방법

생성 스크립트는 `build_cs_dataset.py`이며, 원본 레포를 읽기 전용으로 순회해 위 파이프라인을 적용합니다. 포함 범위나 최소 길이(150자) 기준을 바꾸려면 스크립트 상단 `INCLUDE_DIRS` / `MIN_LEN` 상수를 수정하면 됩니다.
