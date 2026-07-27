package com.aitserver.resume.analysis.event;

import com.aitserver.resume.analysis.service.ResumeAnalysisProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class ResumeAnalysisEventHandler {

    private final ResumeAnalysisProcessor analysisProcessor;

    @Async("aiAnalysisExecutor")
    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT
    )
    public void handle(
            ResumeAnalysisRequestedEvent event
    ) {
        try {
            analysisProcessor.analyzeAndSave(
                    event.resumeId()
            );

            log.info(
                    "이력서 AI 분석 완료. resumeId={}",
                    event.resumeId()
            );

        } catch (Exception exception) {
            log.error(
                    "이력서 AI 분석 실패. resumeId={}",
                    event.resumeId(),
                    exception
            );
        }
    }
}