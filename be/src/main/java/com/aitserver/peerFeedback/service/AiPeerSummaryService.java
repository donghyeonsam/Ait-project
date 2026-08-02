package com.aitserver.peerFeedback.service;



import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.global.gms.client.GmsClient;
import com.aitserver.peerFeedback.entity.PeerFeedback;
import com.aitserver.peerFeedback.repository.PeerFeedbackRepository;
import com.aitserver.peerFeedback.entity.AiPeerSummary;
import com.aitserver.peerFeedback.dto.*;
//import com.aitserver.study.peerSummary.dto.response.AiPeerSummaryResponse;
import com.aitserver.peerFeedback.repository.AiPeerSummaryRepository;
import com.aitserver.studySession.entity.StudySession;
import com.aitserver.studySession.domain.StudySessionStatus;
import com.aitserver.studySession.repository.StudySessionRepository;
import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiPeerSummaryService {

    private final StudySessionRepository
            studySessionRepository;

    private final PeerFeedbackRepository
            peerFeedbackRepository;

    private final AiPeerSummaryRepository
            aiPeerSummaryRepository;

    private final UserRepository
            userRepository;

    private final GmsClient gmsClient;

    private final ObjectMapper objectMapper;

    @Transactional
    public List<AiPeerSummaryResponse> generate(
            Long sessionId
    ) {

        // 1. 세션 조회
        StudySession studySession =
                studySessionRepository
                        .findById(sessionId)
                        .orElseThrow(() ->
                                new BusinessException(
                                        ErrorCode.STUDY_SESSION_NOT_FOUND
                                )
                        );

        // 2. 세션 완전 종료 여부 확인
        validateSessionFinished(studySession);

        /*
         * 이미 생성된 요약이 있다면
         * GMS를 다시 호출하지 않고 기존 결과 반환
         */
        List<AiPeerSummary> existingSummaries =
                aiPeerSummaryRepository
                        .findAllByStudySession_IdOrderByEvaluatee_IdAsc(
                                sessionId
                        );

        if (!existingSummaries.isEmpty()) {

            log.info(
                    "[AiPeerSummaryService] 기존 요약 반환 - sessionId: {}",
                    sessionId
            );

            return convertToResponse(
                    existingSummaries
            );
        }

        // 3. 현재 세션에서 작성된 모든 상호평가 조회
        List<PeerFeedback> peerFeedbacks =
                peerFeedbackRepository
                        .findAllByStudySessionId(
                                sessionId
                        );

        if (peerFeedbacks.isEmpty()) {
            throw new BusinessException(
                    ErrorCode.PEER_FEEDBACK_NOT_FOUND
            );
        }

        /*
         * 4. evaluateeId 기준 그룹화
         *
         * A가 받은 평가: B -> A, C -> A
         * B가 받은 평가: A -> B, C -> B
         */
        Map<Long, GmsEvaluateeFeedbackGroup>
                groupedFeedbacks =
                groupByEvaluatee(peerFeedbacks);

        // 5. GMS 요청 객체 생성
        GmsPeerSummaryRequest gmsRequest =
                GmsPeerSummaryRequest.builder()
                        .sessionId(sessionId)
                        .evaluatees(
                                new ArrayList<>(
                                        groupedFeedbacks.values()
                                )
                        )
                        .build();

        // 6. GMS 호출
        GmsPeerSummaryResponse gmsResponse =
                requestSummaryFromGms(gmsRequest);

        // 7. GMS 응답 검증
        validateGmsResponse(
                groupedFeedbacks.keySet(),
                gmsResponse
        );

        // 8. 요약 결과 저장
        List<AiPeerSummary> summaries =
                saveSummaries(
                        studySession,
                        gmsResponse
                );

        log.info(
                "[AiPeerSummaryService] AI 상호평가 요약 생성 완료 - sessionId: {}, count: {}",
                sessionId,
                summaries.size()
        );

        return convertToResponse(summaries);
    }

    private Map<Long, GmsEvaluateeFeedbackGroup>
    groupByEvaluatee(
            List<PeerFeedback> peerFeedbacks
    ) {

        Map<Long, GmsEvaluateeFeedbackGroup> result =
                new LinkedHashMap<>();

        for (PeerFeedback peerFeedback : peerFeedbacks) {

            Long evaluateeId =
                    peerFeedback
                            .getEvaluateeId();

            GmsEvaluateeFeedbackGroup group =
                    result.get(evaluateeId);

            if (group == null) {
                group =
                        new GmsEvaluateeFeedbackGroup(
                                evaluateeId
                        );

                result.put(
                        evaluateeId,
                        group
                );
            }

            GmsPeerFeedbackItem feedbackItem =
                    GmsPeerFeedbackItem.from(
                            peerFeedback
                    );

            group.addFeedback(feedbackItem);
        }

        return result;
    }

    private GmsPeerSummaryResponse requestSummaryFromGms(
            GmsPeerSummaryRequest request
    ) {

        String developerPrompt = """
                당신은 취업 면접 스터디의 상호평가를 분석하는 전문 코치입니다.

                하나의 스터디 세션에서 여러 참가자가 서로에게 작성한
                점수와 서술형 피드백을 분석하여 평가 대상자별 종합 요약을 작성하세요.

                [작성 규칙]
                1. evaluateeId별로 반드시 하나의 요약을 작성하세요.
                2. evaluateeId는 입력값을 그대로 사용해야 합니다.
                3. 점수와 서술형 피드백에 근거해서만 작성하세요.
                4. 입력에 없는 사실이나 경험을 만들어내지 마세요.
                5. 여러 평가에서 반복적으로 언급된 내용은 주요 특징으로 반영하세요.
                6. 평가 내용이 서로 다르면 단정하지 말고 관찰이 엇갈렸음을 표현하세요.
                7. 강점과 개선할 점을 균형 있게 포함하세요.
                8. 평가자를 특정하거나 evaluatorId를 결과에 언급하지 마세요.
                9. 각 content는 자연스러운 한국어로 4~6문장 정도 작성하세요.
                10. 과도하게 부정적이거나 공격적인 표현은 사용하지 마세요.
                11. 백틱, 마크다운, 부가 설명 없이 순수 JSON만 반환하세요.

                응답은 반드시 아래 JSON 형식을 따라야 합니다.

                {
                  "summaries": [
                    {
                      "evaluateeId": 평가 대상자의 ID,
                      "content": "평가 대상자에 대한 종합 상호평가 요약"
                    }
                  ]
                }
                """;

        try {
            String requestJson =
                    objectMapper.writeValueAsString(
                            request
                    );

            String userPrompt = """
                    아래 JSON은 하나의 스터디 세션에서 수집된 상호평가입니다.
                    evaluatees 배열의 각 항목에 대해 하나씩 요약을 생성하세요.

                    %s
                    """.formatted(requestJson);

            log.info(
                    "[AiPeerSummaryService] GMS 요약 요청 시작 - sessionId: {}, evaluateeCount: {}",
                    request.getSessionId(),
                    request.getEvaluatees().size()
            );

            String rawResponse =
                    gmsClient.generate(
                            developerPrompt,
                            userPrompt
                    );

            String cleanedResponse =
                    cleanGmsResponse(
                            rawResponse
                    );

            return objectMapper.readValue(
                    cleanedResponse,
                    GmsPeerSummaryResponse.class
            );

        } catch (JsonProcessingException exception) {

            log.error(
                    "[AiPeerSummaryService] GMS JSON 처리 실패 - sessionId: {}",
                    request.getSessionId(),
                    exception
            );

            throw new BusinessException(
                    ErrorCode.GMS_RESPONSE_PARSE_FAILED
            );

        } catch (Exception exception) {

            log.error(
                    "[AiPeerSummaryService] GMS 요청 실패 - sessionId: {}",
                    request.getSessionId(),
                    exception
            );

            throw new BusinessException(
                    ErrorCode.GMS_REQUEST_FAILED
            );
        }
    }

    private String cleanGmsResponse(
            String rawResponse
    ) {

        if (rawResponse == null) {
            return "";
        }

        return rawResponse
                .replace("```json", "")
                .replace("```JSON", "")
                .replace("```", "")
                .trim();
    }

    private void validateGmsResponse(
            Set<Long> expectedEvaluateeIds,
            GmsPeerSummaryResponse response
    ) {

        if (response == null
                || response.getSummaries() == null
                || response.getSummaries().isEmpty()) {

            throw new BusinessException(
                    ErrorCode.GMS_RESPONSE_INVALID
            );
        }

        Set<Long> actualEvaluateeIds =
                new HashSet<>();

        for (GmsPeerSummaryItem summary
                : response.getSummaries()) {

            if (summary.getEvaluateeId() == null) {
                throw new BusinessException(
                        ErrorCode.GMS_RESPONSE_INVALID
                );
            }

            if (summary.getContent() == null
                    || summary.getContent().isBlank()) {

                throw new BusinessException(
                        ErrorCode.GMS_RESPONSE_INVALID
                );
            }

            boolean newlyAdded =
                    actualEvaluateeIds.add(
                            summary.getEvaluateeId()
                    );

            // 같은 evaluateeId가 두 번 반환된 경우
            if (!newlyAdded) {
                throw new BusinessException(
                        ErrorCode.GMS_RESPONSE_INVALID
                );
            }
        }

        /*
         * 요청한 평가 대상자와
         * GMS가 반환한 대상자가 정확히 일치하는지 검사
         */
        if (!expectedEvaluateeIds.equals(
                actualEvaluateeIds
        )) {
            throw new BusinessException(
                    ErrorCode.GMS_RESPONSE_INVALID
            );
        }
    }

    private List<AiPeerSummary> saveSummaries(
            StudySession studySession,
            GmsPeerSummaryResponse response
    ) {

        List<AiPeerSummary> summaries =
                new ArrayList<>();

        for (GmsPeerSummaryItem item
                : response.getSummaries()) {

            User evaluatee =
                    userRepository
                            .findById(
                                    item.getEvaluateeId()
                            )
                            .orElseThrow(() ->
                                    new BusinessException(
                                            ErrorCode.USER_NOT_FOUND
                                    )
                            );

            AiPeerSummary summary =
                    AiPeerSummary.builder()
                            .studySession(studySession)
                            .evaluatee(evaluatee)
                            .content(
                                    item.getContent().trim()
                            )
                            .build();

            summaries.add(summary);
        }

        return aiPeerSummaryRepository
                .saveAll(summaries);
    }

    private void validateSessionFinished(
            StudySession studySession
    ) {

        if (studySession.getStatus()
                != StudySessionStatus.ENDED) {

            throw new BusinessException(
                    ErrorCode.STUDY_SESSION_NOT_FINISHED
            );
        }
    }

    private List<AiPeerSummaryResponse>
    convertToResponse(
            List<AiPeerSummary> summaries
    ) {

        List<AiPeerSummaryResponse> responses =
                new ArrayList<>();

        for (AiPeerSummary summary : summaries) {

            AiPeerSummaryResponse response =
                    AiPeerSummaryResponse.from(
                            summary
                    );

            responses.add(response);
        }

        return responses;
    }
}
