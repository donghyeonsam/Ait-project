package com.aitserver.studySession.event;

import com.aitserver.peerFeedback.service.AiPeerSummaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class StudySessionEndedEventListener {

    private final AiPeerSummaryService aiPeerSummaryService;

    @Async
    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT
    )
    public void handle(
            StudySessionEndedEvent event
    ) {
        try {
            aiPeerSummaryService.generate(
                    event.sessionId()
            );
        } catch (Exception exception) {
            log.error(
                    "상호평가 AI 요약 생성 실패: sessionId={}",
                    event.sessionId(),
                    exception
            );
        }
    }
}