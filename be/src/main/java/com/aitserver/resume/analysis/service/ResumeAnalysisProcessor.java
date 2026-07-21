package com.aitserver.resume.analysis.service;

import com.aitserver.resume.analysis.client.GmsClient;
import com.aitserver.resume.analysis.dto.ResumeAnalysisSource;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ResumeAnalysisProcessor {

    private final ResumeAnalysisReader analysisReader;
    private final ResumeAnalysisWriter analysisWriter;
    private final ResumeAnalysisPromptFactory promptFactory;
    private final GmsClient gmsClient;

    public void analyzeAndSave(Long resumeId) {
        ResumeAnalysisSource source =
                analysisReader.read(resumeId);

        String developerPrompt =
                promptFactory.createDeveloperPrompt();

        String userPrompt =
                promptFactory.createUserPrompt(source);

        String analysisContent =
                gmsClient.summarizeResume(
                        developerPrompt,
                        userPrompt
                );

        analysisWriter.save(
                resumeId,
                analysisContent
        );
    }
}