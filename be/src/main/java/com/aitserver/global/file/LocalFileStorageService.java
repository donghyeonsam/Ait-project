package com.aitserver.global.file;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.UUID;

@Service
public class LocalFileStorageService implements FileStorageService {

    // application.yml에 설정한 로컬 경로 (예: C:/aitserver/uploads/)
    @Value("${file.upload.dir}")
    private String fileDir;

    @Override
    public String storeFile(MultipartFile file) {
        if (file.isEmpty()) {
            return null;
        }

        File directory = new File(fileDir);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        // 1. 원본 파일명에서 확장자 추출 (예: image.png -> .png)
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));

        // 2. UUID로 고유한 저장용 파일명 생성 (예: 550e8400... + .png)
        String storedFilename = UUID.randomUUID().toString() + extension;

        // 3. 전체 경로 생성
        String fullPath = fileDir + storedFilename;

        // 4. 로컬 폴더에 물리적 저장
        try {
            file.transferTo(new File(fullPath));
        } catch (IOException e) {
            throw new RuntimeException("파일 저장 실패", e);
        }

        // DB에 저장할 수 있도록 변환된 이름만 반환
        return storedFilename;
    }

    @Override
    public void deleteFile(String storedFilename) {
        File file = new File(fileDir + storedFilename);
        if (file.exists()) {
            file.delete();
        }
    }
}