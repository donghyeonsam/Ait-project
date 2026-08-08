package com.aitserver.github.extractor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
public class JenkinsfileExtractor implements FileExtractor {

    /** stage('Build') / stage("Deploy") 양쪽 모두 매칭 */
    private static final Pattern STAGE = Pattern.compile(
            "stage\\s*\\(\\s*[\"']([^\"']+)[\"']"
    );

    /** stage 이름으로 인정할 형태: 영문/숫자/한글/공백/기본 구두점만 */
    private static final Pattern SAFE_STAGE_NAME = Pattern.compile(
            "^[A-Za-z0-9가-힣 _\\-&/().]+$"
    );

    private static final int MAX_STAGE_NAME_LENGTH = 40;
    private static final int MAX_STAGES = 20;

    @Override
    public boolean supports(String path) {
        String name = fileName(path);
        return name.equals("Jenkinsfile") || name.startsWith("Jenkinsfile.");
    }

    @Override
    public int maxFiles() {
        return 2;
    }

    @Override
    public String extract(String path, String content) {
        try {
            Set<String> stages = new LinkedHashSet<>();
            Matcher matcher = STAGE.matcher(content);

            while (matcher.find() && stages.size() < MAX_STAGES) {
                String name = matcher.group(1).trim();
                if (isSafeStageName(name)) {
                    stages.add(name);
                }
            }

            return stages.isEmpty()
                    ? ""
                    : "pipelineStages: " + String.join(" -> ", stages) + "\n";

        } catch (Exception e) {
            log.warn("[Jenkinsfile 파싱 실패] 경로: {}, 사유: {}", path, e.getMessage());
            return "";
        }
    }

    /**
     * stage 이름에도 서버 주소가 섞이는 경우가 있어(예: "Deploy to 43.201.x.x")
     * 형태가 예상 범위를 벗어나면 버린다.
     */
    private boolean isSafeStageName(String name) {
        if (name.isEmpty() || name.length() > MAX_STAGE_NAME_LENGTH) return false;
        if (name.contains("$")) return false;                       // 변수 치환
        if (name.matches(".*\\d{1,3}(\\.\\d{1,3}){3}.*")) return false;  // IP
        return SAFE_STAGE_NAME.matcher(name).matches();
    }

    private String fileName(String path) {
        int idx = path.lastIndexOf('/');
        return idx < 0 ? path : path.substring(idx + 1);
    }
}