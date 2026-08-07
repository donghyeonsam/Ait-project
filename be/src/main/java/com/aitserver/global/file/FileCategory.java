package com.aitserver.global.file;



import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum FileCategory {

    BOARD("boards"),
    PROFILE("profiles"),
    CHAT("chats");

    // 추가: 파일 종류별로 사용할 하위 폴더명
    private final String directory;
}