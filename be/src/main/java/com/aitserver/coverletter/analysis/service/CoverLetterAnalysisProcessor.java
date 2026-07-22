package com.aitserver.coverletter.analysis.service;

import com.aitserver.coverletter.analysis.client.CoverLetterAnalysisForwardClient;
import com.aitserver.coverletter.analysis.dto.CoverLetterAnalysisContext;
import com.aitserver.global.gms.client.GmsClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class CoverLetterAnalysisProcessor {

    private final CoverLetterAnalysisReader analysisReader;
    private final CoverLetterAnalysisPromptFactory promptFactory;
    private final GmsClient gmsClient;
    private final CoverLetterAnalysisWriter analysisWriter;
    private final CoverLetterAnalysisForwardClient analysisForwardClient;

    public void analyzeAndSave(
            Long coverLetterId
    ) {

        CoverLetterAnalysisContext context =
                analysisReader.read(coverLetterId);

        String developerPrompt =
                promptFactory.createDeveloperPrompt();

        String userPrompt =
                promptFactory.createUserPrompt(
                        context.source()
                );

        String analysisContent =
                gmsClient.generate(
                        developerPrompt,
                        userPrompt
                );


        analysisWriter.save(
                coverLetterId,
                analysisContent
        );


        try {
            analysisForwardClient.send(
                    context.userId(),
                    coverLetterId,
                    analysisContent
            );
        } catch (Exception exception) {

            // FastAPI 전달에 실패해도 이미 저장된 자기소개서 분석 결과는 유지
            log.error(
                    "FastAPI 자기소개서 분석 결과 전달 실패. "
                            + "userId={}, coverLetterId={}",
                    context.userId(),
                    coverLetterId,
                    exception
            );
        }
    }
}