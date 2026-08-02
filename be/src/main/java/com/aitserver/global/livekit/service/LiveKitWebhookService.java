//package com.aitserver.global.livekit.service;
//
//
//import com.aitserver.studySession.entity.StudySession;
//import com.aitserver.studySession.entity.StudySessionParticipant;
//import com.aitserver.studySession.domain.StudySessionParticipantRole;
//import com.aitserver.studySession.repository.StudySessionParticipantRepository;
//import com.aitserver.studySession.repository.StudySessionRepository;
//import com.aitserver.auth.entity.User;
//import com.aitserver.auth.repository.UserRepository;
//import io.livekit.server.WebhookReceiver;
//import livekit.LivekitWebhook;
//import lombok.RequiredArgsConstructor;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//@Slf4j
//@Service
//@RequiredArgsConstructor
//public class LiveKitWebhookService {
//
//    private static final String PARTICIPANT_JOINED =
//            "participant_joined";
//
//    private static final String PARTICIPANT_LEFT =
//            "participant_left";
//
//    private static final String ROOM_STARTED =
//            "room_started";
//
//    private static final String ROOM_FINISHED =
//            "room_finished";
//
//    private final WebhookReceiver webhookReceiver;
//
//    private final StudySessionRepository
//            studySessionRepository;
//
//    private final StudySessionParticipantRepository
//            participantRepository;
//
//    private final UserRepository userRepository;
//
//    @Transactional
//    public void receive(
//            String rawBody,
//            String authorizationHeader
//    ) {
//        LivekitWebhook.WebhookEvent event;
//
//        try {
//            event = webhookReceiver.receive(
//                    rawBody,
//                    authorizationHeader
//            );
//        } catch (RuntimeException exception) {
//            log.warn(
//                    "LiveKit Webhook 검증 실패",
//                    exception
//            );
//
//            throw exception;
//        }
//
//        log.info(
//                "LiveKit Webhook 수신: event={}, room={}, participant={}",
//                event.getEvent(),
//                event.hasRoom()
//                        ? event.getRoom().getName()
//                        : null,
//                event.hasParticipant()
//                        ? event.getParticipant().getIdentity()
//                        : null
//        );
//
//        switch (event.getEvent()) {
//            case PARTICIPANT_JOINED ->
//                    handleParticipantJoined(event);
//
//            case PARTICIPANT_LEFT ->
//                    handleParticipantLeft(event);
//
//            case ROOM_STARTED ->
//                    log.info(
//                            "LiveKit 방 시작: {}",
//                            getRoomName(event)
//                    );
//
//            case ROOM_FINISHED ->
//                    log.info(
//                            "LiveKit 방 종료: {}",
//                            getRoomName(event)
//                    );
//
//            default ->
//                    log.debug(
//                            "현재 처리하지 않는 LiveKit 이벤트: {}",
//                            event.getEvent()
//                    );
//        }
//    }
//
//    private void handleParticipantJoined(
//            LivekitWebhook.WebhookEvent event
//    ) {
//        String roomName = getRoomName(event);
//        String identity = getParticipantIdentity(event);
//
//        Long userId = parseUserId(identity);
//
//        StudySession studySession =
//                studySessionRepository
//                        .findForWebhookByRoomName(roomName)
//                        .orElseThrow(() ->
//                                new IllegalStateException(
//                                        "LiveKit 방과 연결된 스터디 세션을 찾을 수 없습니다. room="
//                                                + roomName
//                                )
//                        );
//
//        User user = userRepository.findById(userId)
//                .orElseThrow(() ->
//                        new IllegalStateException(
//                                "LiveKit 참가자 사용자를 찾을 수 없습니다. userId="
//                                        + userId
//                        )
//                );
//
//        StudySessionParticipantRole role =
//                determineRole(
//                        studySession,
//                        userId
//                );
//
//        StudySessionParticipant participant =
//                participantRepository
//                        .findByStudySessionIdAndUserId(
//                                studySession.getId(),
//                                userId
//                        )
//                        .map(existingParticipant -> {
//                            existingParticipant.rejoin(role);
//                            return existingParticipant;
//                        })
//                        .orElseGet(() ->
//                                StudySessionParticipant.join(
//                                        studySession,
//                                        user,
//                                        role
//                                )
//                        );
//
//        participantRepository.save(participant);
//
//        /*
//         * 첫 번째 실제 참가자가 들어오면
//         * WAITING → IN_PROGRESS로 변경되고
//         * startedAt이 최초 한 번 기록됩니다.
//         */
//        studySession.start();
//
//        log.info(
//                "화상 스터디 참가 처리 완료: sessionId={}, userId={}, role={}",
//                studySession.getId(),
//                userId,
//                role
//        );
//    }
//
//    private void handleParticipantLeft(
//            LivekitWebhook.WebhookEvent event
//    ) {
//        String roomName = getRoomName(event);
//        String identity = getParticipantIdentity(event);
//
//        Long userId = parseUserId(identity);
//
//        StudySession studySession =
//                studySessionRepository
//                        .findForWebhookByRoomName(roomName)
//                        .orElseThrow(() ->
//                                new IllegalStateException(
//                                        "LiveKit 방과 연결된 스터디 세션을 찾을 수 없습니다. room="
//                                                + roomName
//                                )
//                        );
//
//        participantRepository
//                .findByStudySessionIdAndUserId(
//                        studySession.getId(),
//                        userId
//                )
//                .ifPresentOrElse(
//                        participant -> {
//                            participant.leave();
//
//                            log.info(
//                                    "화상 스터디 퇴장 처리 완료: sessionId={}, userId={}",
//                                    studySession.getId(),
//                                    userId
//                            );
//                        },
//                        () -> log.warn(
//                                "퇴장 처리할 참가자 기록이 없습니다. sessionId={}, userId={}",
//                                studySession.getId(),
//                                userId
//                        )
//                );
//    }
//
//    private StudySessionParticipantRole determineRole(
//            StudySession studySession,
//            Long userId
//    ) {
//        return studySession
//                .getStudyGroup()
//                .isOwner(userId)
//                ? StudySessionParticipantRole.HOST
//                : StudySessionParticipantRole.MEMBER;
//    }
//
//    private String getRoomName(
//            LivekitWebhook.WebhookEvent event
//    ) {
//        if (!event.hasRoom()) {
//            throw new IllegalArgumentException(
//                    "LiveKit Webhook에 room 정보가 없습니다."
//            );
//        }
//
//        return event.getRoom().getName();
//    }
//
//    private String getParticipantIdentity(
//            LivekitWebhook.WebhookEvent event
//    ) {
//        if (!event.hasParticipant()) {
//            throw new IllegalArgumentException(
//                    "LiveKit Webhook에 participant 정보가 없습니다."
//            );
//        }
//
//        return event.getParticipant().getIdentity();
//    }
//
//    private Long parseUserId(
//            String identity
//    ) {
//        if (identity == null
//                || !identity.startsWith("user-")) {
//            throw new IllegalArgumentException(
//                    "지원하지 않는 LiveKit participant identity입니다. identity="
//                            + identity
//            );
//        }
//
//        String userIdText =
//                identity.substring("user-".length());
//
//        try {
//            return Long.parseLong(userIdText);
//
//        } catch (NumberFormatException exception) {
//            throw new IllegalArgumentException(
//                    "LiveKit participant identity에서 userId를 추출할 수 없습니다. identity="
//                            + identity,
//                    exception
//            );
//        }
//    }
//}

package com.aitserver.global.livekit.service;

import com.aitserver.global.livekit.LiveKitRoomClient;
import com.aitserver.studySession.entity.StudySession;
import com.aitserver.studySession.entity.StudySessionParticipant;
import com.aitserver.studySession.domain.StudySessionParticipantRole;
import com.aitserver.studySession.repository.StudySessionParticipantRepository;
import com.aitserver.studySession.repository.StudySessionRepository;
import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import io.livekit.server.WebhookReceiver;
import livekit.LivekitWebhook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class LiveKitWebhookService {

    private static final String PARTICIPANT_JOINED =
            "participant_joined";

    private static final String PARTICIPANT_LEFT =
            "participant_left";

    private static final String ROOM_STARTED =
            "room_started";

    private static final String ROOM_FINISHED =
            "room_finished";

    private final WebhookReceiver webhookReceiver;

    private final StudySessionRepository
            studySessionRepository;

    private final StudySessionParticipantRepository
            participantRepository;

    private final UserRepository userRepository;


    private final LiveKitRoomClient liveKitRoomClient;

    @Transactional
    public void receive(
            String rawBody,
            String authorizationHeader
    ) {
        LivekitWebhook.WebhookEvent event;

        try {
            event = webhookReceiver.receive(
                    rawBody,
                    authorizationHeader
            );
        } catch (RuntimeException exception) {
            log.warn(
                    "LiveKit Webhook 검증 실패",
                    exception
            );

            throw exception;
        }

        log.info(
                "LiveKit Webhook 수신: event={}, room={}, participant={}",
                event.getEvent(),
                event.hasRoom()
                        ? event.getRoom().getName()
                        : null,
                event.hasParticipant()
                        ? event.getParticipant().getIdentity()
                        : null
        );

        switch (event.getEvent()) {
            case PARTICIPANT_JOINED ->
                    handleParticipantJoined(event);

            case PARTICIPANT_LEFT ->
                    handleParticipantLeft(event);

            case ROOM_STARTED ->
                    log.info(
                            "LiveKit 방 시작: {}",
                            getRoomName(event)
                    );

            case ROOM_FINISHED ->
                    handleRoomFinished(event);


            default ->
                    log.debug(
                            "현재 처리하지 않는 LiveKit 이벤트: {}",
                            event.getEvent()
                    );
        }
    }

    private void handleParticipantJoined(
            LivekitWebhook.WebhookEvent event
    ) {
        String roomName = getRoomName(event);
        String identity = getParticipantIdentity(event);

        Long userId = parseUserId(identity);

        StudySession studySession =
                studySessionRepository
                        .findForWebhookByRoomName(roomName)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "LiveKit 방과 연결된 스터디 세션을 찾을 수 없습니다. room="
                                                + roomName
                                )
                        );

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalStateException(
                                "LiveKit 참가자 사용자를 찾을 수 없습니다. userId="
                                        + userId
                        )
                );

        StudySessionParticipantRole role =
                determineRole(
                        studySession,
                        userId
                );

        // 강퇴(KICKED) 사용자 검증 및 처리 로직 적용
        StudySessionParticipant existingParticipant =
                participantRepository
                        .findByStudySessionIdAndUserId(
                                studySession.getId(),
                                userId
                        )
                        .orElse(null);

        if (existingParticipant != null
                && existingParticipant.isKicked()) {

            log.warn(
                    "강퇴 사용자의 LiveKit 재접속 감지: "
                            + "sessionId={}, userId={}, identity={}",
                    studySession.getId(),
                    userId,
                    identity
            );

            /*
             * 기존 LiveKit 토큰으로 재접속한 경우 즉시 다시 제거합니다.
             */
            liveKitRoomClient.removeParticipantIfConnected(
                    roomName,
                    identity
            );

            return;
        }

//        StudySessionParticipant participant;
//        if (existingParticipant == null) {
//            participant =
//                    StudySessionParticipant.join(
//                            studySession,
//                            user,
//                            role
//                    );
//        } else {
//            existingParticipant.rejoin(role);
//            participant = existingParticipant;
//        }
//
//        participantRepository.save(participant);


        // 구조 변경
        // 기존 webhook으로 study_session_participants에 사용자 정보를 insert 하던 구조에서
        // 입장 api를 사용해서 insert하고 webhook은 실제 접속이 감지되었을 때 status만 바꾸는 걸로
        if (existingParticipant == null) {
            log.warn(
                    "입장 API 호출 없이 LiveKit에 접속한 사용자입니다. "
                            + "sessionId={}, userId={}, identity={}",
                    studySession.getId(),
                    userId,
                    identity
            );

            return;
        }

        existingParticipant.rejoin(role);

        /*
         * 첫 번째 실제 참가자가 들어오면
         * WAITING → IN_PROGRESS로 변경되고
         * startedAt이 최초 한 번 기록됩니다.
         */
        studySession.start();

        log.info(
                "화상 스터디 참가 처리 완료: sessionId={}, userId={}, role={}",
                studySession.getId(),
                userId,
                role
        );
    }

    private void handleParticipantLeft(
            LivekitWebhook.WebhookEvent event
    ) {
        String roomName = getRoomName(event);
        String identity = getParticipantIdentity(event);

        Long userId = parseUserId(identity);

        StudySession studySession =
                studySessionRepository
                        .findForWebhookByRoomName(roomName)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "LiveKit 방과 연결된 스터디 세션을 찾을 수 없습니다. room="
                                                + roomName
                                )
                        );

        participantRepository
                .findByStudySessionIdAndUserId(
                        studySession.getId(),
                        userId
                )
                .ifPresentOrElse(
                        participant -> {
                            participant.leave();

                            log.info(
                                    "화상 스터디 퇴장 처리 완료: sessionId={}, userId={}",
                                    studySession.getId(),
                                    userId
                            );
                        },
                        () -> log.warn(
                                "퇴장 처리할 참가자 기록이 없습니다. sessionId={}, userId={}",
                                studySession.getId(),
                                userId
                        )
                );
    }

    private StudySessionParticipantRole determineRole(
            StudySession studySession,
            Long userId
    ) {
        return studySession
                .getStudyGroup()
                .isOwner(userId)
                ? StudySessionParticipantRole.HOST
                : StudySessionParticipantRole.MEMBER;
    }

    private String getRoomName(
            LivekitWebhook.WebhookEvent event
    ) {
        if (!event.hasRoom()) {
            throw new IllegalArgumentException(
                    "LiveKit Webhook에 room 정보가 없습니다."
            );
        }

        return event.getRoom().getName();
    }

    private String getParticipantIdentity(
            LivekitWebhook.WebhookEvent event
    ) {
        if (!event.hasParticipant()) {
            throw new IllegalArgumentException(
                    "LiveKit Webhook에 participant 정보가 없습니다."
            );
        }

        return event.getParticipant().getIdentity();
    }

    private Long parseUserId(
            String identity
    ) {
        if (identity == null
                || !identity.startsWith("user-")) {
            throw new IllegalArgumentException(
                    "지원하지 않는 LiveKit participant identity입니다. identity="
                            + identity
            );
        }

        String userIdText =
                identity.substring("user-".length());

        try {
            return Long.parseLong(userIdText);

        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(
                    "LiveKit participant identity에서 userId를 추출할 수 없습니다. identity="
                            + identity,
                    exception
            );
        }
    }

    private void handleRoomFinished(
            LivekitWebhook.WebhookEvent event
    ) {
        String roomName = getRoomName(event);

        StudySession studySession =
                studySessionRepository
                        .findForWebhookByRoomName(roomName)
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "LiveKit 방과 연결된 스터디 세션을 찾을 수 없습니다. room="
                                                + roomName
                                )
                        );

        studySession.end();

        log.info(
                "LiveKit 방 종료에 따른 스터디 세션 종료 처리 완료: "
                        + "sessionId={}, roomName={}",
                studySession.getId(),
                roomName
        );
    }
}
