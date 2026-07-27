package com.aitserver.global.livekit.controller;

import com.aitserver.global.livekit.LiveKitRoomClient;
import livekit.LivekitModels;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;


@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dev/livekit")
public class LiveKitTestController {

    private final LiveKitRoomClient liveKitRoomClient;

    /**
     * LiveKit 서버 연결 및 인증 확인
     */
    @GetMapping("/rooms")
    public List<Map<String, Object>> getRooms() {
        return liveKitRoomClient.listRooms()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * 임시 LiveKit 방 생성
     */
    @PostMapping("/rooms/{roomName}")
    public Map<String, Object> createRoom(
            @PathVariable String roomName
    ) {
        LivekitModels.Room room =
                liveKitRoomClient.createRoom(
                        roomName,
                        8
                );

        return toResponse(room);
    }

    /**
     * 임시 LiveKit 방 삭제
     */
    @DeleteMapping("/rooms/{roomName}")
    public void deleteRoom(
            @PathVariable String roomName
    ) {
        liveKitRoomClient.deleteRoom(roomName);
    }

    private Map<String, Object> toResponse(
            LivekitModels.Room room
    ) {
        return Map.of(
                "sid", room.getSid(),
                "name", room.getName(),
                "maxParticipants",
                room.getMaxParticipants(),
                "numParticipants",
                room.getNumParticipants()
        );
    }
}