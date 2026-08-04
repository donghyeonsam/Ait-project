"""
RAG 검색 서비스
- Chroma 에서 user_id 로 필터링 + 쿼리 유사도로 관련 문서 청크 조회
- 면접 유형에 맞춰 doc_type 별 참고 비율(가중치)을 다르게 배분
- CS 면접은 사용자가 고른 CS 카테고리 내부로 검색 범위를 제한

[전체 서비스 흐름에서의 역할]
RAG(Retrieval-Augmented Generation)의 "R"을 담당한다. LLM에게 질문/꼬리질문/답변보완을
시키기 전에, 지원자가 실제로 제출한 이력서/자소서/GitHub 분석 내용을 이 서비스로 먼저
검색해서 프롬프트에 근거로 넣어준다 — 이렇게 해야 LLM이 지원자와 무관한 일반론이 아니라
"이 지원자가 실제로 한 프로젝트/기술"을 근거로 질문하고 채점할 수 있다.
호출하는 쪽: services/question_service.py(질문 생성), services/followup_service.py
(꼬리질문 채점), services/answer_service.py(답변 보완) 전부 이 모듈의 retrieve_context()
또는 retrieve_cs_knowledge()/retrieve_cs_knowledge_random() → format_context() 순서로 사용한다.
"""
import json
import logging
import random

from config import settings
from db.chroma import get_collection, get_cs_collection
from schemas.common import InterviewType, DocType, CSCategory

logger = logging.getLogger(__name__)


# ────────────────────────────
# [문서 참고 비율 기능 - 신규] 면접 유형별 이력서/자소서/GitHub 참고 비율
# ────────────────────────────
# 값은 100 기준 백분율이며, 팀 요구사항에 맞춰 이 표만 고치면 즉시 반영된다
# (코드 다른 곳은 건드릴 필요 없음 — retrieve_context() 가 이 표를 읽어 top_k를 배분한다).
# 합계가 정확히 100일 필요는 없다(비율 값이므로 상대적 크기만 의미가 있다). 다만 가독성을
# 위해 100 기준으로 맞춰두는 것을 권장한다.
# COMPREHENSIVE(종합 면접)은 "질문 특성에 맞게 알아서" 배분하라는 요구사항이라 고정 비율을
# 두지 않았다 — 빈 dict({})로 두면 retrieve_context() 가 doc_type 구분 없이 유사도
# 순으로만 top_k 를 채운다(기존 동작과 동일, LLM이 문맥상 가장 관련 있는 문서를 자연스럽게
# 더 많이 참고하게 됨).
DOC_TYPE_WEIGHTS: dict[InterviewType, dict[DocType, int]] = {
    InterviewType.JOB: {
        DocType.RESUME: 50,
        DocType.COVER_LETTER: 40,
        DocType.GITHUB: 10,
    },
    InterviewType.CS: {
        DocType.RESUME: 10,
        DocType.COVER_LETTER: 40,
        DocType.GITHUB: 50,
    },
    InterviewType.TECH: {
        DocType.RESUME: 10,
        DocType.COVER_LETTER: 40,
        DocType.GITHUB: 50,
    },
    InterviewType.PORTFOLIO: {
        DocType.RESUME: 10,
        DocType.COVER_LETTER: 30,
        DocType.GITHUB: 60,
    },
    InterviewType.COMPREHENSIVE: {},  # 고정 비율 없음 — 질문 특성(유사도)에 맡김
}


def _allocate_top_k(total_top_k: int, weights: dict[DocType, int]) -> dict[DocType, int]:
    """
    total_top_k 를 DOC_TYPE_WEIGHTS 비율대로 doc_type별 정수 개수로 쪼갠다.

    "최대 나머지법(largest remainder method)"을 사용한다: 비율대로 나눈 값의 소수점을
    버린 몫을 먼저 배분하고, top_k 가 정수라 생기는 나머지(반올림 오차)는 소수점 이하가
    큰 순서대로 하나씩 나눠준다. 예) top_k=5, {resume:50, cover:40, github:10} 이면
    2.5/2.0/0.5 → 몫 2/2/0 → 나머지 1개를 소수점이 가장 큰 resume(0.5)에 배분 → 3/2/0.

    total_top_k 가 매우 작을 때(예: followup_service.py 가 top_k=3 으로 호출하는 경우)
    비율이 낮은 doc_type 은 0개가 배분될 수 있다 — 이는 "비율이 낮다"는 의도를 그대로
    반영한 정상 동작이다(개수를 억지로 최소 1개씩 보장하지 않음).
    """
    if not weights or total_top_k <= 0:
        return {}

    raw = {dt: total_top_k * pct / 100 for dt, pct in weights.items()}
    allocation = {dt: int(v) for dt, v in raw.items()}
    remainder = total_top_k - sum(allocation.values())

    # 소수점 이하가 큰 순서로 정렬해 나머지를 배분 (동률이면 DOC_TYPE_WEIGHTS 선언 순서 유지)
    order = sorted(raw, key=lambda dt: raw[dt] - allocation[dt], reverse=True)
    for dt in order[:remainder]:
        allocation[dt] += 1
    return allocation


def build_target_ids(
    resume_id: int | None,
    cover_letter_id: int | None,
    github_repo_id: int | None,
) -> dict[DocType, int]:
    """
    [BE 요청 형식 개편 - 2026-07-23, 세션 전체로 확장] resume_id/cover_letter_id/
    github_repo_id 중 값이 있는 것만 모아 retrieve_context() 가 기대하는
    dict[DocType, int] 형태로 변환하는 공용 헬퍼.

    처음엔 question_service.py 안에 로컬 함수로만 있었으나, "면접 시작 시 지정한
    문서를 그 이후 꼬리질문(/followup) 단계에서도 계속 참고해야 한다"는 요구사항에
    따라 QuestionGenerateRequest 뿐 아니라 FollowupRequest 에도 동일한 3개 필드가
    추가되면서, question_service.py/followup_service.py 가 똑같은 변환 로직을
    중복 구현하지 않도록 여기(retrieve_context()와 같은 모듈)로 옮겼다. 개별
    인자를 받게 한 이유는 특정 request 스키마 타입에 결합되지 않기 위함이다(두
    요청 스키마 모두 이 세 필드를 갖고 있지만 서로 다른 클래스다).

    셋 다 선택 값(문서 종류에 따라 없을 수 있음 - 예: 아직 GitHub 연동 안 한 사용자).
    """
    target_ids: dict[DocType, int] = {}
    if resume_id is not None:
        target_ids[DocType.RESUME] = resume_id
    if cover_letter_id is not None:
        target_ids[DocType.COVER_LETTER] = cover_letter_id
    if github_repo_id is not None:
        target_ids[DocType.GITHUB] = github_repo_id
    return target_ids


def _parse_json_metadata(raw: str | None) -> list:
    """
    [구조화 분석 문서 활용 - 신규] services/embedding_service.py의
    _build_chunk_metadata()가 json.dumps(ensure_ascii=False)로 문자열화해 저장해둔
    값(question_topics 등)을 복원한다.

    값이 없거나(기존 평문 청크는 이 메타데이터 자체가 없음) JSON이 아니면 조용히
    빈 리스트를 반환한다 — RAG 컨텍스트 조립 중 예외로 전체 검색을 막으면 안 되므로,
    새 포맷/기존 포맷 청크가 섞여 있어도 이 함수 하나로 안전하게 처리한다.
    """
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return []
    return parsed if isinstance(parsed, list) else []


def _rows_to_contexts(docs: list[str], metas: list[dict], dists: list[float]) -> list[dict]:
    """Chroma query() 응답 3종 리스트(documents/metadatas/distances)를 컨텍스트 dict로 변환."""
    contexts: list[dict] = []
    for doc, meta, dist in zip(docs, metas, dists):
        contexts.append(
            {
                "content": doc,
                "doc_type": meta.get("doc_type", ""),
                "title": meta.get("title", ""),
                "distance": dist,
                # [구조화 분석 문서 활용 - 신규] 새 포맷으로 저장된 청크만 이 두 키가
                # 실제 값을 갖는다. 기존 평문 청크는 메타데이터 자체가 없어
                # _parse_json_metadata()가 빈 리스트를, meta.get()이 빈 문자열을
                # 돌려주므로 format_context()에서 자연스럽게 건너뛴다.
                "question_topics": _parse_json_metadata(meta.get("question_topics")),
                "uncertainties": meta.get("uncertainties", ""),
            }
        )
    return contexts


def _query_personal(user_id: int, query: str, where: dict, top_k: int) -> list[dict]:
    """
    개인 문서 컬렉션(user_documents)에 대한 단일 Chroma 유사도 검색 실행.
    retrieve_context() 가 doc_type별로 이 함수를 여러 번 호출(가중치 배분)하거나,
    가중치가 없을 때(COMPREHENSIVE) 한 번만 호출한다.
    """
    if top_k <= 0:
        return []
    collection = get_collection()
    try:
        result = collection.query(query_texts=[query], n_results=top_k, where=where)
    except Exception as e:  # noqa: BLE001
        # 해당 사용자/doc_type의 임베딩이 아예 없는 경우(문서 미등록 등) Chroma가 예외를
        # 던질 수 있어 방어적으로 빈 리스트를 반환한다 → question_service.py 등은 이를
        # "문서 없음"으로 받아 일반 질문/랜덤 CS 지식으로 대체한다.
        logger.warning("RAG 조회 실패 (빈 컬렉션 가능): %s", e)
        return []

    docs = result.get("documents", [[]])[0]
    metas = result.get("metadatas", [[]])[0]
    dists = result.get("distances", [[]])[0]
    return _rows_to_contexts(docs, metas, dists)


def retrieve_context(
    user_id: int,
    query: str,
    interview_type: InterviewType,
    top_k: int | None = None,
    target_ids: dict[DocType, int] | None = None,
) -> list[dict]:
    """
    개인 문서(user_documents 컬렉션)에서 관련 문서 청크 조회.

    [문서 참고 비율 기능] DOC_TYPE_WEIGHTS 에 면접 유형별 비율이 정의돼 있으면, 전체
    top_k 를 doc_type(이력서/자소서/GitHub)별로 쪼개 "각각 따로" 검색한 뒤 합친다.
    이렇게 하는 이유: 단순히 doc_type 필터만 걸고 top_k 개를 통으로 뽑으면 Chroma가
    유사도 순으로만 채우기 때문에, 예를 들어 GitHub 문서가 쿼리와 우연히 더 비슷하면
    이력서 비중이 원하는 50%보다 훨씬 낮아질 수 있다 — doc_type별로 쿼리를 분리해야
    "이력서 50% / 자소서 40% / GitHub 10%" 같은 비율이 실제로 보장된다.
    비율이 없는 면접 유형(COMPREHENSIVE)은 기존처럼 doc_type 구분 없이 유사도 top_k
    그대로 사용한다.

    호출 시점: 질문 생성 시(주제 전반을 검색), 꼬리질문/답변보완 시(직전 질문+답변을
    쿼리로 재검색해 더 좁고 정확한 근거를 찾음) — 즉 면접 진행 상황에 따라 쿼리 문자열만
    바뀌고 이 함수 자체는 동일하게 재사용된다.

    [BE 요청 형식 개편 - 신규, 세션 전체로 확장] target_ids 가 주어지면(예:
    {DocType.RESUME: 10}), 해당 doc_type 검색 시 "이 사용자의 해당 타입 문서 전체"가
    아니라 "이 특정 target_id 문서"로 범위를 좁힌다. BE가 면접마다 참고할 이력서/
    자소서/GitHub 레포를 명시적으로 지정할 수 있게 된 것(QuestionGenerateRequest.
    resume_id 등)에 대응 — 사용자가 이력서를 여러 개 등록해둔 경우 이번 면접과
    무관한 이력서가 섞여 들어가는 것을 방지한다. target_ids 에 없는 doc_type 은
    기존처럼 user_id(+doc_type)만으로 검색한다.
    question_service.py(질문 생성) 뿐 아니라 followup_service.py(꼬리질문)/
    answer_service.py(답변 보완)도 build_target_ids() 로 만든 동일한 target_ids를
    넘겨, 같은 면접 세션 안에서는 세 단계 모두 질문 생성 시 지정한 문서를 일관되게
    계속 참고한다. 기본값 None 은 target_ids 자체가 없는(즉 이 파라미터를 아예 모르는)
    호출부를 위한 하위 호환 장치다.

    Returns:
        [{"content": str, "doc_type": str, "title": str, "distance": float}, ...]
        (distance 는 코사인 거리 — 값이 작을수록 쿼리와 더 유사한 문서)
    """
    top_k = top_k or settings.rag_top_k
    target_ids = target_ids or {}
    weights = DOC_TYPE_WEIGHTS.get(interview_type, {})

    if not weights:
        # [BE 요청 형식 개편] 비율 없는 분기(COMPREHENSIVE 등)는 원래 "문서 종류 구분
        # 없이 유사도 순으로만" 통으로 조회하는 게 목적이라 doc_type별 쿼리를 분리하지
        # 않는다. 하지만 target_ids 가 주어졌는데 그냥 무시하면 "이 면접엔 이 이력서만
        # 참고하라"는 BE 지정이 조용히 씹히게 되므로, target_ids 가 있을 때만 예외적으로
        # doc_type별로 나눠 조회한다(각 doc_type에 target_id 필터를 걸고, top_k는
        # 균등 분배 대신 doc_type마다 전체 top_k로 조회한 뒤 이어붙인다 — 지정된 문서가
        # 소수이므로 개수 배분보다 "지정한 문서가 반드시 포함되는지"가 더 중요하다).
        if target_ids:
            contexts: list[dict] = []
            for doc_type, target_id in target_ids.items():
                where = {
                    "$and": [
                        {"user_id": user_id},
                        {"doc_type": doc_type.value},
                        {"target_id": target_id},
                    ]
                }
                contexts.extend(_query_personal(user_id, query, where, top_k))
            logger.info(
                "RAG 조회(비율 없음, target_ids 지정): user=%s type=%s target_ids=%s hits=%s",
                user_id, interview_type.value,
                {dt.value: tid for dt, tid in target_ids.items()}, len(contexts),
            )
            return contexts

        where = {"user_id": user_id}
        contexts = _query_personal(user_id, query, where, top_k)
        logger.info("RAG 조회(비율 없음): user=%s type=%s hits=%s",
                    user_id, interview_type.value, len(contexts))
        return contexts

    allocation = _allocate_top_k(top_k, weights)
    contexts: list[dict] = []
    for doc_type, n in allocation.items():
        if n <= 0:
            continue
        where_and = [{"user_id": user_id}, {"doc_type": doc_type.value}]
        target_id = target_ids.get(doc_type)
        if target_id is not None:
            where_and.append({"target_id": target_id})
        where = {"$and": where_and}
        contexts.extend(_query_personal(user_id, query, where, n))

    logger.info(
        "RAG 조회(비율 적용): user=%s type=%s allocation=%s target_ids=%s hits=%s",
        user_id, interview_type.value,
        {dt.value: n for dt, n in allocation.items()},
        {dt.value: tid for dt, tid in target_ids.items()}, len(contexts),
    )
    return contexts


# ────────────────────────────
# [CS 카테고리 제한 기능 - 신규] CS 지식 카테고리 매핑
# ────────────────────────────
# schemas.common.CSCategory(사용자가 GUI에서 고르는 9가지) → data/cs_knowledge.json 에
# 실제로 들어있는 원본 category 문자열(gyoogle 레포 폴더 구조 그대로 시딩됨, cs_knowledge_dataset.md 참고).
# retrieve_cs_knowledge()/retrieve_cs_knowledge_random() 이 이 표로 Chroma "category" 메타데이터
# $in 필터를 만든다 — 즉 "사용자가 고른 카테고리 밖의 CS 지식은 절대 검색되지 않는다"를
# 보장하는 실질적인 매핑 테이블이다.
#
# ⚠️ 매핑 판단 노트 (팀 확인 필요):
#  - SECURITY(보안): 행정안전부 소프트웨어 개발보안 가이드(2021.12.29) 제4장 49개 보안약점
#    항목(개요+보안대책)과 기존 SQL Injection/HTTP&HTTPS/TLS HandShake/대칭키&공개키 4건의
#    복제분을 합쳐 총 53건을 Security > Web/Auth/Crypto/System 4개 category로 시드했다.
#  - OPERATING_SYSTEM 에 "Computer Science > Computer Architecture"(컴퓨터 구조)를 함께
#    묶었다 — 사용자가 고른 9개 카테고리에 별도의 "컴퓨터 구조" 항목이 없어서 커리큘럼상
#    가장 가까운 운영체제 카테고리에 포함시킨 임의 판단이다.
#  - LANGUAGE_FRAMEWORK(언어 및 프레임워크)에 "Web > React/Spring/Vue/DevOps"(프레임워크
#    구체 지식)를 배정하고, WEB(WEB) 카테고리에는 범용 "Web"(HTTP/REST 등 웹 일반 지식)만
#    남겼다 — 프레임워크 구체 지식과 웹 일반 지식을 구분하는 편이 사용자 의도에 더 맞다고 판단.
CS_CATEGORY_RAW_MAP: dict[CSCategory, list[str]] = {
    CSCategory.DATA_STRUCTURE_ALGORITHM: [
        "Algorithm",
        "Algorithm > professional",
        "Computer Science > Data Structure",
    ],
    CSCategory.OPERATING_SYSTEM: [
        "Computer Science > Operating System",
        "Computer Science > Computer Architecture",
    ],
    CSCategory.NETWORK: [
        "Computer Science > Network",
    ],
    CSCategory.WEB: [
        "Web",
    ],
    CSCategory.DATABASE: [
        "Computer Science > Database",
    ],
    CSCategory.SECURITY: [
        "Security > Web",
        "Security > Auth",
        "Security > Crypto",
        "Security > System",
    ],
    CSCategory.SOFTWARE_ENGINEERING: [
        "Computer Science > Software Engineering",
        "Design Pattern",
    ],
    CSCategory.AI: [
        "New Technology > AI",
        "AI > Machine Learning",
        "AI > Deep Learning",
    ],
    CSCategory.LANGUAGE_FRAMEWORK: [
        "Web > DevOps",
        "Web > React",
        "Web > Spring",
        "Web > Vue",
    ],
}


def _cs_category_where(cs_categories: list[CSCategory]) -> dict | None:
    """
    [BE 요청 형식 개편 - 다중 선택 대응] cs_categories(최대 3개)에 매핑된 원본 category
    문자열을 전부 합쳐(union) Chroma "category" $in 필터를 만든다. 카테고리가 여러 개여도
    "이 중 하나라도 매칭되면 검색 대상"이 되는 것이 자연스러운 동작이므로 합집합으로
    처리한다. 리스트가 비어있으면 None(무제한)을 반환한다.
    """
    if not cs_categories:
        return None
    raw: list[str] = []
    for c in cs_categories:
        raw.extend(CS_CATEGORY_RAW_MAP.get(c, []))
    if not raw:
        return None
    return {"category": {"$in": raw}}


def _has_no_seed_data(cs_categories: list[CSCategory]) -> bool:
    """
    [BE 요청 형식 개편 - 다중 선택 대응] 선택된 카테고리 전부의 CS_CATEGORY_RAW_MAP
    매핑을 합쳤을 때 원본 category 문자열이 하나도 없는지 여부.
    (예: SECURITY 만 선택 — 시드 데이터 자체가 없음, 상단 CS_CATEGORY_RAW_MAP 주석 참고)
    Chroma의 where 절은 "$in": [] (빈 리스트) 를 유효하지 않은 필터로 보고 예외를 던지므로,
    Chroma를 호출하기 전에 미리 걸러내 "조회 실패"가 아니라 "애초에 검색 대상이 없음"으로
    명확히 로그를 남기고 빈 리스트를 반환한다.
    """
    if not cs_categories:
        return True
    return not any(CS_CATEGORY_RAW_MAP.get(c, []) for c in cs_categories)


def retrieve_cs_knowledge(
    query: str,
    cs_categories: list[CSCategory] | None = None,
    top_k: int | None = None,
) -> list[dict]:
    """
    CS 전역 지식(cs_knowledge) 검색. user_id 필터 없음 (모든 사용자 공용).

    [CS 카테고리 제한 기능 / BE 요청 형식 개편 - 다중 선택 대응] cs_categories 가
    주어지면 CS_CATEGORY_RAW_MAP 으로 변환한 category $in 필터(선택된 카테고리들의
    합집합)를 강제로 걸어, "사용자가 고른 카테고리들 밖의 지식"은 애초에 검색 후보에
    오르지 않게 한다(단순 우선순위가 아니라 하드 필터).
    question_service.py 가 CS/종합 면접일 때만 retrieve_context() 결과에 이 함수의
    결과를 이어붙여, "지원자 개인 문서 근거 + CS 일반 지식 근거"를 함께 프롬프트에 담는다.
    """
    cs_categories = cs_categories or []
    if _has_no_seed_data(cs_categories):
        logger.info(
            "CS 지식 조회 스킵: categories=%s 매핑된 시드 데이터 없음",
            [c.value for c in cs_categories],
        )
        return []

    collection = get_cs_collection()
    top_k = top_k or settings.cs_top_k
    where = _cs_category_where(cs_categories)
    try:
        result = collection.query(query_texts=[query], n_results=top_k, where=where)
    except Exception as e:  # noqa: BLE001
        logger.warning("CS 지식 조회 실패 (빈 컬렉션 가능): %s", e)
        return []

    docs = result.get("documents", [[]])[0]
    metas = result.get("metadatas", [[]])[0]
    dists = result.get("distances", [[]])[0]

    contexts: list[dict] = []
    for doc, meta, dist in zip(docs, metas, dists):
        contexts.append({
            "content": doc, "doc_type": "cs_knowledge",
            "category": meta.get("category", ""), "concept": meta.get("concept", ""),
            "title": meta.get("concept", ""), "distance": dist,
        })
    logger.info("CS 지식 조회: categories=%s hits=%s", [c.value for c in cs_categories], len(contexts))
    return contexts


def retrieve_cs_knowledge_random(
    cs_categories: list[CSCategory],
    top_k: int | None = None,
) -> list[dict]:
    """
    [CS 카테고리 제한 기능 / BE 요청 형식 개편 - 다중 선택 대응] 쿼리 유사도가 아니라,
    선택한 카테고리들 내부에서 "무작위로" CS 지식 청크를 뽑는다.

    사용 시점: services/question_service.py 가 "사용자의 개인 문서(이력서/자소서/GitHub)가
    선택한 CS 카테고리와 유사도가 너무 낮다"고 판단했을 때(예: '보안' 카테고리를 골랐는데
    지원자 문서에는 프론트엔드 얘기만 있는 경우). 이럴 때 개인 문서 기반 질문을 억지로
    만드는 대신, "선택한 카테고리 안에서라면 어떤 질문이든 괜찮다"는 요구사항에 따라
    카테고리 전체 풀에서 무작위로 뽑아 다양성을 확보한다(매번 같은 상위 유사도 문서만
    반복해서 뽑히는 것을 피함). 카테고리를 여러 개 선택한 경우 _cs_category_where() 가
    이미 합집합 풀을 만들어주므로, 그 풀에서 무작위로 뽑는 것만으로 자연스럽게 여러
    카테고리를 아우르게 된다 — 카테고리별로 균등 배분하는 로직은 이번 범위에 포함하지
    않는다(필요하면 나중에 DOC_TYPE_WEIGHTS처럼 별도 개선).

    Chroma의 query()는 쿼리 임베딩과의 유사도 순으로만 반환하므로 "무작위 추출"에는
    맞지 않아, 대신 get()으로 카테고리 내 전체 후보를 가져온 뒤 random.sample로 뽑는다.
    """
    if _has_no_seed_data(cs_categories):
        logger.info(
            "CS 지식 랜덤 조회 스킵: categories=%s 매핑된 시드 데이터 없음",
            [c.value for c in cs_categories],
        )
        return []

    collection = get_cs_collection()
    top_k = top_k or settings.cs_top_k
    where = _cs_category_where(cs_categories)
    try:
        result = collection.get(where=where, include=["documents", "metadatas"])
    except Exception as e:  # noqa: BLE001
        logger.warning("CS 지식 랜덤 조회 실패 (빈 컬렉션 가능): %s", e)
        return []

    ids = result.get("ids", []) or []
    docs = result.get("documents", []) or []
    metas = result.get("metadatas", []) or []
    if not ids:
        logger.info(
            "CS 지식 랜덤 조회: categories=%s 후보 없음(시드 데이터 부족)",
            [c.value for c in cs_categories],
        )
        return []

    indices = list(range(len(ids)))
    random.shuffle(indices)
    chosen = indices[:top_k]

    contexts: list[dict] = []
    for i in chosen:
        meta = metas[i] or {}
        contexts.append({
            "content": docs[i], "doc_type": "cs_knowledge",
            "category": meta.get("category", ""), "concept": meta.get("concept", ""),
            "title": meta.get("concept", ""),
            "distance": None,  # 유사도 검색이 아니라 무작위 추출이므로 거리 개념이 없음
        })
    logger.info("CS 지식 랜덤 조회: categories=%s pool=%s hits=%s",
                [c.value for c in cs_categories], len(ids), len(contexts))
    return contexts


def format_context(contexts: list[dict]) -> str:
    """
    retrieve_context()/retrieve_cs_knowledge()/retrieve_cs_knowledge_random() 결과를
    LLM 프롬프트에 그대로 붙여넣을 수 있는 텍스트 블록으로 정리한다.
    prompts/templates.py 의 build_question_prompt(), build_followup_prompt() 가
    각각 이 함수의 반환값을 "## 지원자 문서 (RAG 검색 결과)" 섹션에 그대로 삽입한다.

    검색 결과가 하나도 없으면(신규 가입자라 문서가 아직 없는 경우, 혹은 CS 카테고리에
    매칭되는 시드 데이터가 없는 경우 등) LLM이 근거 문서가 없다는 걸 명확히 인지하고
    "일반적인 질문"으로 대체하도록 안내 문구를 넣어준다.

    [구조화 분석 문서 활용 - 신규] 새 구조화 포맷으로 저장된 청크(services/
    embedding_service.py 참고)는 question_topics(면접관이 확인하면 좋은 주제)와
    uncertainties(추가로 확인이 필요한 부분)를 함께 갖고 있다. 이 두 정보가 있으면
    문서 블록 아래에 덧붙여, prompts/templates.py의 build_question_prompt()/
    build_followup_prompt()가 "## 지원자 문서 (RAG 검색 결과)" 섹션을 그대로 받아
    쓸 때 이 힌트까지 자연스럽게 활용하도록 한다. 기존 평문 청크는 이 값이 항상
    비어 있으므로(_rows_to_contexts() 참고) 아무 영향 없이 그대로 동작한다.
    """
    if not contexts:
        return "(관련 문서 없음 — 일반적인 질문을 생성하세요.)"

    blocks: list[str] = []
    label = {
        "resume": "이력서",
        "cover_letter": "자기소개서",
        "github": "GitHub",
        "cs_knowledge": "CS지식",
    }
    for i, ctx in enumerate(contexts, 1):
        src = label.get(ctx["doc_type"], ctx["doc_type"])
        # CS 지식은 category(대분류)를, 개인 문서는 title(레포명/회사명 등)을 부제로 표시
        # — 두 컬렉션의 메타데이터 구조가 다르기 때문에(schemas/cs_knowledge.py 참고) 분기 처리.
        if ctx["doc_type"] == "cs_knowledge":
            sub = f" - {ctx.get('category', '')}" if ctx.get("category") else ""
        else:
            sub = f" - {ctx['title']}" if ctx.get("title") else ""
        block = f"[문서 {i} | {src}{sub}]\n{ctx['content']}"

        topics = ctx.get("question_topics") or []
        topic_line = "; ".join(
            f"{t.get('topic', '')}({t.get('reason', '')})"
            for t in topics
            if isinstance(t, dict) and t.get("topic")
        )
        if topic_line:
            block += f"\n(면접관이 확인하면 좋은 주제: {topic_line})"

        uncertainties = ctx.get("uncertainties") or ""
        if uncertainties:
            block += f"\n(추가로 확인이 필요한 부분: {uncertainties.replace(',', ', ')})"

        blocks.append(block)
    return "\n\n".join(blocks)
