//package com.aitserver.global.file;
//
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.stereotype.Service;
//import org.springframework.web.multipart.MultipartFile;
//
//import java.io.File;
//import java.io.IOException;
//import java.util.ArrayList;
//import java.util.List;
//import java.util.UUID;
//
//@Service
//public class LocalFileStorageService implements FileStorageService {
//
//    // application.yml에 설정한 로컬 경로 (예: C:/aitserver/uploads/)
//    @Value("${file.upload.dir}")
//    private String fileDir;
//
//    @Override
//    public String storeFile(MultipartFile file) {
//        if (file.isEmpty()) {
//            return null;
//        }
//
//        File directory = new File(fileDir);
//        if (!directory.exists()) {
//            directory.mkdirs();
//        }
//
//        // 1. 원본 파일명에서 확장자 추출 (예: image.png -> .png)
//        String originalFilename = file.getOriginalFilename();
//        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
//
//        // 2. UUID로 고유한 저장용 파일명 생성 (예: 550e8400... + .png)
//        String storedFilename = UUID.randomUUID().toString() + extension;
//
//        // 3. 전체 경로 생성
//        String fullPath = fileDir + storedFilename;
//
//        // 4. 로컬 폴더에 물리적 저장
//        try {
//            file.transferTo(new File(fullPath));
//        } catch (IOException e) {
//            throw new RuntimeException("파일 저장 실패", e);
//        }
//
//        // DB에 저장할 수 있도록 변환된 이름만 반환
//        return storedFilename;
//    }
//
//    @Override
//    public void deleteFile(String storedFilename) {
//        File file = new File(fileDir + storedFilename);
//        if (file.exists()) {
//            file.delete();
//        }
//    }
//
//    public List<String> storeFiles(List<MultipartFile> files) {
//        // 빈 리스트가 오면 빈 리스트 반환
//        if (files == null || files.isEmpty()) {
//            return new ArrayList<>();
//        }
//
//        return files.stream()
//                .map(this::storeFile)
//                .toList();
//    }
//}

package com.aitserver.global.file;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class LocalFileStorageService implements FileStorageService {

    // application.yml에 설정한 로컬 경로 (예: C:/aitserver/uploads/)
    @Value("${file.upload.dir}")
    private String fileDir;

    @Override
    public String storeFile(MultipartFile file) {

        // 기존 게시판 코드에서 storeFile(file)을 호출하면
        // 자동으로 boards 폴더에 저장되도록 처리
        return storeFile(file, FileCategory.BOARD);
    }

    // 파일 종류에 따라 boards 또는 profiles 폴더에 저장
    @Override
    public String storeFile(
            MultipartFile file,
            FileCategory category
    ) {
        if (file.isEmpty()) {
            return null;
        }

        // 기본 업로드 폴더 아래에 파일 종류별 하위 폴더 생성
        // 예: C:/aitserver/uploads/boards/
        // 예: C:/aitserver/uploads/profiles/
        File directory = new File(
                fileDir,
                category.getDirectory()
        );

        if (!directory.exists()) {
            directory.mkdirs();
        }

        // 1. 원본 파일명에서 확장자 추출 (예: image.png -> .png)
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename.substring(
                originalFilename.lastIndexOf(".")
        );

        // 2. UUID로 고유한 저장용 파일명 생성 (예: 550e8400... + .png)
        String storedFilename =
                UUID.randomUUID().toString() + extension;

        // 3. 전체 경로 생성
        // 추가: 문자열로 경로를 이어붙이지 않고 생성된 하위 폴더 기준으로 파일 경로 생성
        File storedFile = new File(
                directory,
                storedFilename
        );

        // 4. 로컬 폴더에 물리적 저장
        try {
            file.transferTo(storedFile);
        } catch (IOException e) {
            throw new RuntimeException("파일 저장 실패", e);
        }

        // DB에는 하위 폴더를 포함한 상대 경로를 저장
        // 예: boards/uuid.png
        // 예: profiles/uuid.png
        return category.getDirectory()
                + "/"
                + storedFilename;
    }

    @Override
    public void deleteFile(String storedFilename) {

        // storedFilename에 boards/uuid.png 또는
        // profiles/uuid.png가 들어오면 해당 하위 폴더 파일을 삭제
        File file = new File(fileDir, storedFilename);

        if (file.exists()) {
            file.delete();
        }
    }

    public List<String> storeFiles(
            List<MultipartFile> files
    ) {
        // 빈 리스트가 오면 빈 리스트 반환
        if (files == null || files.isEmpty()) {
            return new ArrayList<>();
        }

        // 기존 게시판 다중 이미지 저장은 boards 폴더 사용
        return files.stream()
                .map(this::storeFile)
                .toList();
    }

    // 여러 파일도 원하는 폴더에 저장할 수 있도록 오버로딩
    public List<String> storeFiles(
            List<MultipartFile> files,
            FileCategory category
    ) {
        // 빈 리스트가 오면 빈 리스트 반환
        if (files == null || files.isEmpty()) {
            return new ArrayList<>();
        }

        return files.stream()
                .map(file -> storeFile(file, category))
                .toList();
    }
}