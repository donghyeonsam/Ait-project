"""
꼬리질문 서비스(services/followup_service.py) narrowing 로직 단위 테스트.

[꼬리질문 narrowing 전환 - 신규] GMS(LLM)/Chroma 호출은 실제 네트워크/모델
의존성이 있어 단위 테스트 범위에서 전부 모킹한다. 표준 라이브러리(unittest,
unittest.mock)만 사용하고 requirements.txt에 새 의존성을 추가하지 않는다.

실행 방법: docs/AI_작업일지_0726.md 참고.
"""
import unittest
from unittest.mock import AsyncMock, patch

from config import settings
from schemas.common import InterviewType
from schemas.interview import FollowupRequest, FollowupQuestionInfo
from services import followup_service


def _make_request(*, rubric: list[str], depth: int = 0, answer: str = "답변입니다.") -> FollowupRequest:
    return FollowupRequest(
        user_id=1,
        ai_interview_id=100,
        interview_type=InterviewType.TECH,
        question=FollowupQuestionInfo(
            order=1,
            question="React에서 상태 관리를 어떻게 했나요?",
            rubric=rubric,
            topic="React",
            source="cover_letter",
            depth=depth,
        ),
        answer=answer,
    )


class GenerateFollowupTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # RAG 검색은 이번 테스트 범위 밖 — 항상 빈 컨텍스트로 고정한다.
        patcher_retrieve = patch.object(followup_service, "retrieve_context", return_value=[])
        patcher_format = patch.object(followup_service, "format_context", return_value="")
        patcher_target_ids = patch.object(followup_service, "build_target_ids", return_value={})
        self.addCleanup(patcher_retrieve.stop)
        self.addCleanup(patcher_format.stop)
        self.addCleanup(patcher_target_ids.stop)
        patcher_retrieve.start()
        patcher_format.start()
        patcher_target_ids.start()

    async def test_partial_narrowing_returns_only_unpassed_rubric(self):
        """# 1: rubric=[A, B], LLM unpassed=[B] → is_pass=false, rubric==[B], depth==1"""
        req = _make_request(rubric=["A 기준", "B 기준"], depth=0)
        with patch.object(
            followup_service.gms_client,
            "chat_json",
            new=AsyncMock(return_value={"unpassed_rubric": ["B 기준"], "followup_question": "B에 대해 더 말씀해주세요."}),
        ):
            res = await followup_service.generate_followup(req)

        self.assertFalse(res.is_pass)
        self.assertIsNotNone(res.next_question)
        self.assertEqual(res.next_question.rubric, ["B 기준"])
        self.assertEqual(res.next_question.depth, 1)

    async def test_all_passed_returns_is_pass_true(self):
        """# 2: rubric=[B], LLM unpassed=[] → is_pass=true, next_question is None"""
        req = _make_request(rubric=["B 기준"], depth=0)
        with patch.object(
            followup_service.gms_client,
            "chat_json",
            new=AsyncMock(return_value={"unpassed_rubric": [], "followup_question": None}),
        ):
            res = await followup_service.generate_followup(req)

        self.assertTrue(res.is_pass)
        self.assertIsNone(res.next_question)

    async def test_empty_rubric_skips_llm_call(self):
        """# 3: rubric=[] → is_pass=true, GMS 호출 0회"""
        req = _make_request(rubric=[], depth=0)
        with patch.object(
            followup_service.gms_client, "chat_json", new=AsyncMock()
        ) as mock_chat:
            res = await followup_service.generate_followup(req)

        self.assertTrue(res.is_pass)
        self.assertIsNone(res.next_question)
        mock_chat.assert_not_called()

    async def test_depth_cap_skips_llm_call(self):
        """# 4: rubric=[A, B], depth=max_followup_per_question → is_pass=true, GMS 호출 0회"""
        req = _make_request(rubric=["A 기준", "B 기준"], depth=settings.max_followup_per_question)
        with patch.object(
            followup_service.gms_client, "chat_json", new=AsyncMock()
        ) as mock_chat:
            res = await followup_service.generate_followup(req)

        self.assertTrue(res.is_pass)
        self.assertIsNone(res.next_question)
        mock_chat.assert_not_called()

    async def test_hallucinated_unpassed_item_is_discarded(self):
        """# 5: LLM이 존재하지 않는 기준을 섞어 반환해도 입력 rubric의 부분집합만 남는다"""
        req = _make_request(rubric=["A 기준", "B 기준"], depth=0)
        with patch.object(
            followup_service.gms_client,
            "chat_json",
            new=AsyncMock(
                return_value={
                    "unpassed_rubric": ["존재하지 않는 기준", "B 기준"],
                    "followup_question": "B에 대해 더 말씀해주세요.",
                }
            ),
        ):
            res = await followup_service.generate_followup(req)

        self.assertFalse(res.is_pass)
        self.assertEqual(res.next_question.rubric, ["B 기준"])

    async def test_missing_followup_question_falls_back_to_pass(self):
        """# 6: unpassed_rubric은 남아있는데 followup_question이 비어있으면(LLM 누락)
        교착 상태를 막기 위해 강제로 is_pass=true 처리한다."""
        req = _make_request(rubric=["A 기준", "B 기준"], depth=0)
        with patch.object(
            followup_service.gms_client,
            "chat_json",
            new=AsyncMock(return_value={"unpassed_rubric": ["A 기준", "B 기준"], "followup_question": None}),
        ):
            res = await followup_service.generate_followup(req)

        self.assertTrue(res.is_pass)
        self.assertIsNone(res.next_question)


if __name__ == "__main__":
    unittest.main()
