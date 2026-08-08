package com.aitserver.github.extractor;

public interface FileExtractor {

    /**
     * @param path 레포 루트 기준 전체 경로 (예: ".github/workflows/deploy.yml")
     */
    boolean supports(String path);

    /**
     * 원문에서 안전한 정보만 추출.
     * 파싱 실패 시 반드시 빈 문자열 반환 (원문을 절대 그대로 돌려주지 않는다).
     */
    String extract(String path, String content);

    /**
     * 같은 추출기가 담당하는 파일의 최대 수집 개수.
     */
    default int maxFiles() {
        return 3;
    }
}