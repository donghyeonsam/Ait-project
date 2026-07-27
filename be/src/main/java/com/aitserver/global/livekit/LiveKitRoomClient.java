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
}