package com.aitserver.global.livekit.service;

import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.global.livekit.LiveKitParticipantMetadata;
import com.aitserver.global.livekit.LiveKitProperties;
import com.aitserver.studySession.domain.StudySessionParticipantRole;
import io.livekit.server.AccessToken;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class LiveKitTokenService {

    private static final Duration TOKEN_TTL =
            Duration.ofHours(2);

    private final LiveKitProperties properties;
    private final JsonMapper jsonMapper;

    public String createParticipantToken(
            Long sessionId,
            String roomName,
            Long userId,
            String participantName,
            StudySessionParticipantRole role
    ) {
        String participantIdentity =
                createParticipantIdentity(userId);

        String metadata = createMetadata(
                sessionId,
                userId,
                role
        );

        try {
            AccessToken token = new AccessToken(
                    properties.apiKey(),
                    properties.apiSecret()
            );

            token.setIdentity(participantIdentity);
            token.setName(participantName);
            token.setMetadata(metadata);

            token.addGrants(
                    new RoomJoin(true),
                    new RoomName(roomName)
            );

            token.setTtl(
                    TOKEN_TTL.toMillis()
            );

            return token.toJwt();

        } catch (RuntimeException exception) {
            throw new BusinessException(
                    ErrorCode.LIVEKIT_TOKEN_GENERATION_FAILED
            );
        }
    }

    public String createParticipantIdentity(
            Long userId
    ) {
        return "user-" + userId;
    }

    private String createMetadata(
            Long sessionId,
            Long userId,
            StudySessionParticipantRole role
    ) {
        LiveKitParticipantMetadata metadata =
                new LiveKitParticipantMetadata(
                        sessionId,
                        userId,
                        role
                );

        try {
            return jsonMapper.writeValueAsString(metadata);

        } catch (JacksonException exception) {
            throw new BusinessException(
                    ErrorCode.LIVEKIT_TOKEN_GENERATION_FAILED
            );
        }
    }
}