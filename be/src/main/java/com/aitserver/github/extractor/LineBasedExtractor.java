package com.aitserver.github.extractor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Pattern;

@Slf4j
@Component
public class LineBasedExtractor implements FileExtractor {

    /** requirements.txt의 버전 지정자 구분 기호 */
    private static final Pattern VERSION_SPECIFIER = Pattern.compile("[=<>!~;\\[\\s].*$");

    /** 패키지명으로 인정할 형태 (영숫자, 하이픈, 언더스코어, 점) */
    private static final Pattern PACKAGE_NAME = Pattern.compile("^[A-Za-z0-9._-]+$");

    @Override
    public boolean supports(String path) {
        String name = fileName(path);
        return isDockerfile(name) || isRequirements(name);
    }

    @Override
    public int maxFiles() {
        return 5; // Dockerfile과 requirements가 쿼터를 공유하므로 넉넉히
    }

    @Override
    public String extract(String path, String content) {
        try {
            String name = fileName(path);
            if (isDockerfile(name)) {
                return extractDockerfile(content);
            }
            if (isRequirements(name)) {
                return extractRequirements(content);
            }
            return "";
        } catch (Exception e) {
            log.warn("[줄 단위 파싱 실패] 경로: {}, 사유: {}", path, e.getMessage());
            return "";
        }
    }

    // ------------------------------------------------------------ Dockerfile

    /** FROM과 EXPOSE만 읽는다. RUN, ENV, ARG, CMD는 접근하지 않는다. */
    private String extractDockerfile(String content) {
        Set<String> images = new LinkedHashSet<>();
        Set<String> ports = new LinkedHashSet<>();

        for (String rawLine : content.split("\\R")) {
            String line = rawLine.trim();
            if (line.isEmpty() || line.startsWith("#")) continue;

            String upper = line.toUpperCase();

            if (upper.startsWith("FROM ")) {
                String image = line.substring(5).trim().split("\\s+")[0];
                String sanitized = stripRegistryHost(image);
                if (!sanitized.isBlank()) {
                    images.add(sanitized);
                }
            } else if (upper.startsWith("EXPOSE ")) {
                for (String token : line.substring(7).trim().split("\\s+")) {
                    if (token.matches("^\\d+(/\\w+)?$")) {
                        ports.add(token);
                    }
                }
            }
        }

        StringBuilder sb = new StringBuilder();
        if (!images.isEmpty()) {
            sb.append("baseImages: ").append(String.join(", ", images)).append("\n");
            if (images.size() > 1) {
                sb.append("multiStage: true\n");
            }
        }
        if (!ports.isEmpty()) {
            sb.append("expose: ").append(String.join(", ", ports)).append("\n");
        }
        return sb.toString();
    }

    /**
     * 사설 레지스트리 호스트를 제거한다.
     * 예) 123456789.dkr.ecr.ap-northeast-2.amazonaws.com/myapp:latest -> myapp:latest
     */
    private String stripRegistryHost(String image) {
        if (image.startsWith("$")) return ""; // ARG 치환은 값을 알 수 없으므로 버린다

        int slash = image.indexOf('/');
        if (slash < 0) return image;

        String head = image.substring(0, slash);
        boolean isHost = head.contains(".") || head.contains(":") || head.equals("localhost");

        return isHost ? image.substring(image.lastIndexOf('/') + 1) : image;
    }

    // -------------------------------------------------------- requirements.txt

    /** 패키지명만 읽는다. 옵션 줄(-r, --index-url 등)과 VCS URL은 통째로 버린다. */
    private String extractRequirements(String content) {
        Set<String> packages = new LinkedHashSet<>();

        for (String rawLine : content.split("\\R")) {
            String line = rawLine.trim();
            if (line.isEmpty() || line.startsWith("#")) continue;

            // --index-url, --extra-index-url, -r, -e : 인증 정보가 박히는 자리
            if (line.startsWith("-")) continue;

            // git+https://token@... 형태 차단
            if (line.contains("://") || line.contains("@")) continue;

            int comment = line.indexOf('#');
            if (comment >= 0) {
                line = line.substring(0, comment).trim();
            }

            String name = VERSION_SPECIFIER.matcher(line).replaceAll("").trim();
            if (!name.isEmpty() && PACKAGE_NAME.matcher(name).matches()) {
                packages.add(name);
            }
        }

        return packages.isEmpty()
                ? ""
                : "pythonPackages: " + String.join(", ", packages) + "\n";
    }

    // ------------------------------------------------------------------ 공통

    private boolean isDockerfile(String name) {
        return name.equals("Dockerfile")
                || name.startsWith("Dockerfile.")
                || name.endsWith(".Dockerfile");
    }

    private boolean isRequirements(String name) {
        return name.startsWith("requirements") && name.endsWith(".txt");
    }

    private String fileName(String path) {
        int idx = path.lastIndexOf('/');
        return idx < 0 ? path : path.substring(idx + 1);
    }
}