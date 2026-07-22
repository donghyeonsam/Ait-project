package com.aitserver.resume.analysis.client;

import com.aitserver.resume.analysis.config.GmsProperties;
import com.aitserver.resume.analysis.dto.GmsChatRequest;
import com.aitserver.resume.analysis.dto.GmsChatResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;


@Component
public class GmsClient {

    private final RestClient gmsRestClient;
    private final GmsProperties properties;

    public GmsClient(
            @Qualifier("gmsRestClient")
            RestClient gmsRestClient,
            GmsProperties properties
    ) {
        this.gmsRestClient = gmsRestClient;
        this.properties = properties;
    }

    public String summarizeResume(
            String developerPrompt,
            String userPrompt
    ) {
        GmsChatRequest request = GmsChatRequest.of(
                properties.model(),
                developerPrompt,
                userPrompt
        );

        try {
            GmsChatResponse response = gmsRestClient.post()
                    .uri("/chat/completions")
                    .body(request)
                    .retrieve()
                    .body(GmsChatResponse.class);

            return extractContent(response);

        } catch (RestClientException exception) {
            throw new IllegalStateException(
                    "GMS 이력서 분석 요청에 실패했습니다.",
                    exception
            );
        }
    }

    private String extractContent(
            GmsChatResponse response
    ) {
        if (response == null
                || response.choices() == null
                || response.choices().isEmpty()) {
            throw new IllegalStateException(
                    "GMS 응답에 choices가 존재하지 않습니다."
            );
        }

        GmsChatResponse.Message message =
                response.choices().get(0).message();

        if (message == null
                || message.content() == null
                || message.content().isBlank()) {
            throw new IllegalStateException(
                    "GMS 응답에 분석 내용이 존재하지 않습니다."
            );
        }

        return message.content().trim();
    }
}