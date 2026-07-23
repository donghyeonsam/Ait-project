"""
꼬리질문 서비스 (Phase 2 - 루브릭 기반 동적 꼬리질문)

[루브릭 아키텍처 전환]
기존에는 "꼬리질문이 필요한가?"를 LLM에게 애매하게 물어보고(need_followup),
질문당 최대 횟수(followup_depth 카운터)로만 종료를 제어했다.

이제는 Phase 1에서 질문과 함께 만들어둔 rubric(채점 기준)을 답변과 함께 LLM에 넘겨,
LLM 1회 호출(One-Call JSON Mode)로 다음을 동시에 처리한다:
  1) rubric 항목별 pass/fail 채점
  2) 통과하지 못한 항목이 있으면, 그 부분만 겨냥한 꼬리질문 생성

종료 조건이 "카운터가 다 됐는가"에서 "rubric을 실제로 다 통과했는가"로 바뀌므로
훨씬 더 목적 지향적인 꼬리질문이 나온다. 다만 rubric이 계속 통과되지 않아 대화가
무한정 이어지는 것을 막기 위해, followup_depth 는 "안전장치용 상한 체크" 용도로만
남겨두었다(주 종료 조건은 all_passed).

[루브릭 아키텍처 재설계] 꼬리질문 생성 시 expected_answer(사전 예상 답안)도 더 이상
만들지 않는다. 사용자가 이 꼬리질문에 실제로 답변을 제출한 뒤 services/answer_service.py 가
그 답변을 보완한 ai_answer 를 별도로 생성한다.
"""
import logging

from config import settings
from core.gms_client import gms_client, GMSError
from prompts.templates import FOLLOWUP_SYSTEM, build_followup_prompt
from schemas.interview import FollowupRequest, FollowupResponse, RubricResult
from services.rag_service import retrieve_context, format_context, build_target_ids

logger = logging.getLogger(__name__)


async def generate_followup(req: FollowupRequest) -> FollowupResponse:
    max_depth = settings.max_followup_per_question

    # 1. 안전장치: 꼬리질문 횟수 상한 도달 → LLM 호출 없이 즉시 종료.
    #    [루브릭 아키텍처 전환] rubric이 계속 통과되지 못해도 무한정 파고들지 않도록
    #    막는 하드 캡(hard cap)이다. 실제로 rubric을 채점한 것이 아니므로
    #    capped=True 로 표시해 "진짜 통과"와 구분하고, rubric_results 는 채점하지
    #    않았다는 의미로 빈 리스트를 반환한다 (BE/리포트가 이 차이를 구분해야 함).
    if req.followup_depth >= max_depth:
        logger.info(
            "꼬리질문 한도 도달(capped): interview=%s depth=%s max=%s",
            req.ai_interview_id, req.followup_depth, max_depth,
        )
        return FollowupResponse(
            ai_interview_id=req.ai_interview_id,
            rubric_results=[],
            all_passed=True,
            followup_question=None,
            followup_depth=req.followup_depth,
            capped=True,
        )

    # 2. 답변 + 질문 기반 RAG 검색 (관련 근거 보강)
    # [BE 요청 형식 개편 - 2026-07-23, 세션 전체로 확장] 질문 생성(/questions) 때
    # BE가 지정한 문서(resume_id/cover_letter_id/github_repo_id)를 FollowupRequest에도
    # 그대로 받아 target_ids로 넘긴다 — 이걸 빼먹으면 꼬리질문 단계에서는 사용자의
    # 다른 이력서/자소서/GitHub까지 다시 검색 대상에 섞여, 같은 면접 세션 안에서
    # 참고 문서가 질문 생성 때와 달라지는 비일관성이 생긴다.
    query = f"{req.parent_question} {req.user_answer}"
    target_ids = build_target_ids(req.resume_id, req.cover_letter_id, req.github_repo_id)
    contexts = retrieve_context(
        req.user_id, query, req.interview_type, top_k=3, target_ids=target_ids
    )
    context_text = format_context(contexts)

    # 3. 프롬프트 구성 & GMS 호출
    #    [루브릭 아키텍처 전환] remaining(남은 횟수) 대신 rubric 목록을 프롬프트에 전달.
    #    LLM은 이제 "몇 번 더 물어볼 수 있는가"가 아니라 "이 답변이 rubric을 충족했는가"만 판단한다.
    prompt = build_followup_prompt(
        interview_type=req.interview_type,
        parent_question=req.parent_question,
        rubric=req.rubric,
        user_answer=req.user_answer,
        context=context_text,
    )
    try:
        data = await gms_client.chat_json(FOLLOWUP_SYSTEM, prompt, temperature=0.7)
    except GMSError:
        raise

    if not isinstance(data, dict):
        data = {}

    # 4. rubric_results 파싱 & 검증
    #    - LLM이 개수를 다르게 반환하거나 형식을 어길 수 있으므로 방어적으로 정규화한다.
    #    - criterion 이 입력 rubric과 일치하지 않아도(LLM이 문구를 살짝 바꿔 반환하는 경우)
    #      그대로 신뢰하지 않고, 입력 rubric 순서를 기준으로 매핑을 시도한다.
    raw_results = data.get("rubric_results", [])
    rubric_results: list[RubricResult] = []
    if isinstance(raw_results, list):
        for i, item in enumerate(raw_results):
            if not isinstance(item, dict):
                continue
            # criterion 이 비어있으면 입력 rubric의 같은 순번 항목으로 보정
            criterion = str(item.get("criterion") or "").strip()
            if not criterion and i < len(req.rubric):
                criterion = req.rubric[i]
            rubric_results.append(
                RubricResult(
                    criterion=criterion,
                    passed=bool(item.get("passed", False)),
                    reason=item.get("reason"),
                )
            )

    # 5. all_passed 재계산
    #    [루브릭 아키텍처 전환] LLM이 보낸 all_passed 플래그를 그대로 신뢰하지 않고,
    #    실제 파싱된 rubric_results 로 서버 측에서 재검증한다. rubric_results가
    #    하나도 파싱되지 않았다면(LLM 응답 형식 오류) 안전하게 "미통과"로 간주해
    #    꼬리질문 쪽으로 넘어가게 한다.
    all_passed = bool(rubric_results) and all(r.passed for r in rubric_results)

    followup_question = data.get("followup_question")

    # 방어: all_passed=false 인데 꼬리질문이 비어있으면(LLM 누락) 무효 처리하지 않고
    # all_passed=true 로 강제 전환한다 — 빈 질문으로 BE가 다음 단계를 진행하지 못하는
    # 상황(꼬리질문도 없고 진행도 안 되는 교착 상태)을 막기 위한 방어적 처리다.
    has_followup = bool(followup_question and str(followup_question).strip())
    if not all_passed and not has_followup:
        all_passed = True

    new_depth = req.followup_depth + 1 if (not all_passed and has_followup) else req.followup_depth

    logger.info(
        "꼬리질문 채점 완료: interview=%s all_passed=%s depth=%s->%s rubric_count=%s",
        req.ai_interview_id, all_passed, req.followup_depth, new_depth, len(rubric_results),
    )

    return FollowupResponse(
        ai_interview_id=req.ai_interview_id,
        rubric_results=rubric_results,
        all_passed=all_passed,
        followup_question=str(followup_question).strip() if not all_passed and has_followup else None,
        followup_depth=new_depth,
        capped=False,
    )
