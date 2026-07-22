package com.aitserver.resume.analysis.service;

import com.aitserver.global.gms.client.GmsClient;
import com.aitserver.resume.analysis.client.ResumeAnalysisForwardClient;
import com.aitserver.resume.analysis.dto.ResumeAnalysisContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResumeAnalysisProcessor {

    private final ResumeAnalysisReader analysisReader;
    private final ResumeAnalysisPromptFactory promptFactory;
    private final GmsClient gmsClient;
    private final ResumeAnalysisWriter analysisWriter;
    private final ResumeAnalysisForwardClient analysisForwardClient;

    public void analyzeAndSave(Long resumeId) {
        ResumeAnalysisContext context =
                analysisReader.read(resumeId);

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

        //먼저 Spring 서버 DB에 분석 결과를 저장
        //Writer의 트랜잭션은 이 메서드가 반환될 때 커밋
        analysisWriter.save(
                resumeId,
                analysisContent
        );

        // 이후 fastapi로 전송한다.
        try {
            analysisForwardClient.send(
                    context.userId(),
                    resumeId,
                    analysisContent
            );
        } catch (Exception exception) {

            // FastAPI 전달에 실패해도 이미 저장된 analysis_content는 유지
            log.error(
                    "FastAPI 이력서 분석 결과 전달 실패. userId={}, resumeId={}",
                    context.userId(),
                    resumeId,
                    exception
            );
        }
    }
}