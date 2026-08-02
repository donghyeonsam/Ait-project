package com.aitserver.global.file;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface FileStorageService {
    // 단일 파일 저장 후, 변환된 파일명(또는 URL) 반환
    String storeFile(MultipartFile file);


    String storeFile(MultipartFile file, FileCategory category);

    // 파일 삭제 (나중에 게시글 삭제 시 물리적 파일도 지우기 위함)
    void deleteFile(String storedFilename);
    List<String> storeFiles(List<MultipartFile> files);

    
    List<String> storeFiles(List<MultipartFile> files, FileCategory category);
}