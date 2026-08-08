package com.aitserver.github.extractor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
public class GradleExtractor implements FileExtractor {

    /** implementation("org.x:y:1.0") / implementation 'org.x:y' 양쪽 모두 매칭 */
    private static final Pattern DEPENDENCY = Pattern.compile(
            "(?:implementation|api|compileOnly|runtimeOnly|annotationProcessor|testImplementation|developmentOnly)"
                    + "\\s*[\\s(]\\s*[\"']([^\"']+)[\"']"
    );

    /** plugins 블록의 id 'org.springframework.boot' */
    private static final Pattern PLUGIN_ID = Pattern.compile(
            "id\\s*[\\s(]\\s*[\"']([^\"']+)[\"']"
    );

    /** JavaVersion.VERSION_17 / sourceCompatibility = '17' / languageVersion.set(JavaLanguageVersion.of(17)) */
    private static final Pattern JAVA_VERSION = Pattern.compile(
            "(?:JavaVersion\\.VERSION_(\\d+)"
                    + "|sourceCompatibility\\s*=\\s*[\"']?([\\d.]+)[\"']?"
                    + "|JavaLanguageVersion\\.of\\((\\d+)\\))"
    );

    @Override
    public boolean supports(String path) {
        String name = fileName(path);
        return name.equals("build.gradle") || name.equals("build.gradle.kts")
                || name.equals("settings.gradle") || name.equals("settings.gradle.kts");
    }

    @Override
    public int maxFiles() {
        return 5; // 멀티모듈 대비
    }

    @Override
    public String extract(String path, String content) {
        try {
            StringBuilder sb = new StringBuilder();

            Set<String> plugins = findAll(PLUGIN_ID, content, 1);
            if (!plugins.isEmpty()) {
                sb.append("plugins: ").append(String.join(", ", plugins)).append("\n");
            }

            Set<String> deps = findAll(DEPENDENCY, content, 1);
            if (!deps.isEmpty()) {
                sb.append("dependencies: ").append(String.join(", ", deps)).append("\n");
            }

            String javaVersion = findJavaVersion(content);
            if (javaVersion != null) {
                sb.append("java: ").append(javaVersion).append("\n");
            }

            return sb.toString();

        } catch (Exception e) {
            log.warn("[gradle 파싱 실패] 경로: {}, 사유: {}", path, e.getMessage());
            return "";
        }
    }

    private Set<String> findAll(Pattern pattern, String content, int group) {
        Set<String> results = new LinkedHashSet<>();
        Matcher matcher = pattern.matcher(content);
        while (matcher.find()) {
            String value = matcher.group(group);
            if (value != null && !value.isBlank()) {
                results.add(value.trim());
            }
        }
        return results;
    }

    private String findJavaVersion(String content) {
        Matcher matcher = JAVA_VERSION.matcher(content);
        while (matcher.find()) {
            for (int i = 1; i <= matcher.groupCount(); i++) {
                if (matcher.group(i) != null) {
                    return matcher.group(i);
                }
            }
        }
        return null;
    }

    private String fileName(String path) {
        int idx = path.lastIndexOf('/');
        return idx < 0 ? path : path.substring(idx + 1);
    }
}