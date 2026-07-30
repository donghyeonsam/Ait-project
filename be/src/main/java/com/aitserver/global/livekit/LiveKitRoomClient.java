package com.aitserver.global.livekit;

import io.livekit.server.LiveKitAPI;
import io.livekit.server.ServerError;
import livekit.LivekitModels;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import retrofit2.Response;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class LiveKitRoomClient {

    private static final int EMPTY_TIMEOUT_SECONDS = 300;

    private final LiveKitAPI liveKitAPI;

    /**
     * LiveKit 방을 생성합니다.
     *
     * @param roomName       LiveKit 방 이름
     * @param maxParticipants 최대 참가 인원
     * @return 생성된 LiveKit 방 정보
     */
    public LivekitModels.Room createRoom(
            String roomName,
            int maxParticipants
    ) {
        try {
            Response<LivekitModels.Room> response =
                    liveKitAPI.getRoom()
                            .createRoom(
                                    roomName,
                                    EMPTY_TIMEOUT_SECONDS,
                                    maxParticipants
                            )
                            .execute();

            if (!response.isSuccessful()) {
                throw createApiException(
                        "LiveKit 방 생성",
                        response
                );
            }

            LivekitModels.Room room = response.body();

            if (room == null) {
                throw new IllegalStateException(
                        "LiveKit 방 생성 응답이 비어 있습니다."
                );
            }

            return room;

        } catch (IOException e) {
            throw new IllegalStateException(
                    "LiveKit 서버에 연결할 수 없습니다.",
                    e
            );
        }
    }

    /**
     * 현재 활성화된 LiveKit 방 목록을 조회합니다.
     */
    public List<LivekitModels.Room> listRooms() {
        try {
            Response<List<LivekitModels.Room>> response =
                    liveKitAPI.getRoom()
                            .listRooms()
                            .execute();

            if (!response.isSuccessful()) {
                throw createApiException(
                        "LiveKit 방 목록 조회",
                        response
                );
            }

            List<LivekitModels.Room> rooms = response.body();

            return rooms == null
                    ? List.of()
                    : rooms;

        } catch (IOException e) {
            throw new IllegalStateException(
                    "LiveKit 서버에 연결할 수 없습니다.",
                    e
            );
        }
    }

    /**
     * LiveKit 방을 삭제합니다.
     *
     * 방을 삭제하면 현재 연결된 참가자도 연결 해제됩니다.
     */
    public void deleteRoom(
            String roomName
    ) {
        try {
            Response<Void> response =
                    liveKitAPI.getRoom()
                            .deleteRoom(roomName)
                            .execute();

            if (!response.isSuccessful()) {
                throw createApiException(
                        "LiveKit 방 삭제",
                        response
                );
            }

        } catch (IOException e) {
            throw new IllegalStateException(
                    "LiveKit 서버에 연결할 수 없습니다.",
                    e
            );
        }
    }

    private IllegalStateException createApiException(
            String operation,
            Response<?> response
    ) {
        ServerError serverError =
                ServerError.from(response);

        if (serverError != null) {
            return new IllegalStateException(
                    operation
                            + "에 실패했습니다. code="
                            + serverError.getCode()
                            + ", message="
                            + serverError.getMessage()
            );
        }

        return new IllegalStateException(
                operation
                        + "에 실패했습니다. HTTP status="
                        + response.code()
        );
    }

    /**
     * LiveKit 방에 실제로 연결된 참가자 목록을 조회합니다.
     */
    public List<LivekitModels.ParticipantInfo> listParticipants(
            String roomName
    ) {
        try {
            Response<List<LivekitModels.ParticipantInfo>> response =
                    liveKitAPI.getRoom()
                            .listParticipants(roomName)
                            .execute();

            if (!response.isSuccessful()) {
                throw createApiException(
                        "LiveKit 참가자 목록 조회",
                        response
                );
            }

            List<LivekitModels.ParticipantInfo> participants =
                    response.body();

            return participants == null
                    ? List.of()
                    : participants;

        } catch (IOException e) {
            throw new IllegalStateException(
                    "LiveKit 서버에 연결할 수 없습니다.",
                    e
            );
        }
    }

    /**
     * 참가자가 실제 LiveKit 방에 연결돼 있다면 강제로 퇴장시킵니다.
     *
     * @return 실제 RemoveParticipant API를 호출했으면 true,
     *         이미 연결돼 있지 않았다면 false
     */
    public boolean removeParticipantIfConnected(
            String roomName,
            String participantIdentity
    ) {
        boolean connected =
                listParticipants(roomName)
                        .stream()
                        .anyMatch(participant ->
                                participantIdentity.equals(
                                        participant.getIdentity()
                                )
                        );

        if (!connected) {
            return false;
        }

        try {
            Response<Void> response =
                    liveKitAPI.getRoom()
                            .removeParticipant(
                                    roomName,
                                    participantIdentity
                            )
                            .execute();

            if (response.isSuccessful()) {
                return true;
            }

            /*
             * 목록 확인 직후 사용자가 먼저 퇴장하는 경쟁 상황이
             * 발생할 수 있습니다.
             */
            if (response.code() == 404) {
                return false;
            }

            ServerError serverError =
                    ServerError.from(response);

            if (serverError != null
                    && "not_found".equalsIgnoreCase(
                    serverError.getCode()
            )) {
                return false;
            }

            throw createApiException(
                    "LiveKit 참가자 제거",
                    response
            );

        } catch (IOException exception) {
            throw new IllegalStateException(
                    "LiveKit 서버에 연결할 수 없습니다.",
                    exception
            );
        }
    }

    public boolean deleteRoomIfExists(
            String roomName
    ) {
        try {
            Response<Void> response =
                    liveKitAPI.getRoom()
                            .deleteRoom(roomName)
                            .execute();

            if (response.isSuccessful()) {
                return true;
            }

            ServerError serverError =
                    ServerError.from(response);

            boolean roomNotFound =
                    response.code() == 404
                            || (
                            serverError != null
                                    && "not_found".equalsIgnoreCase(
                                    serverError.getCode()
                            )
                    );

            /*
             * 이미 방이 종료됐거나 자동으로 사라졌다면
             * DB 종료 처리는 계속 진행합니다.
             */
            if (roomNotFound) {
                return false;
            }

            throw createApiException(
                    "LiveKit 방 삭제",
                    response
            );

        } catch (IOException exception) {
            throw new IllegalStateException(
                    "LiveKit 서버에 연결할 수 없습니다.",
                    exception
            );
        }
    }

}