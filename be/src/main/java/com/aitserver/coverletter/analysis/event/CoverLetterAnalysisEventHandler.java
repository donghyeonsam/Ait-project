package com.aitserver.coverletter.analysis.event;

import com.aitserver.coverletter.analysis.service.CoverLetterAnalysisProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class CoverLetterAnalysisEventHandler {

    private final CoverLetterAnalysisProcessor analysisProcessor;

    @Async("aiAnalysisExecutor")
    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT
    )
    public void handle(
            CoverLetterAnalysisRequestedEvent event
    ) {
        try {
            log.info(
                    "자기소개서 분석 시작. coverLetterId={}",
                    event.coverLetterId()
            );

            analysisProcessor.analyzeAndSave(
                    event.coverLetterId()
            );

            log.info(
                    "자기소개서 분석 완료. coverLetterId={}",
                    event.coverLetterId()
            );

        } catch (Exception exception) {
            log.error(
                    "자기소개서 분석 실패. coverLetterId={}",
                    event.coverLetterId(),
                    exception
            );
        }
    }
}