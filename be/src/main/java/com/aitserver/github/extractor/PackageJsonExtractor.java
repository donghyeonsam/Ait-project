package com.aitserver.github.extractor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Slf4j
@Component
public class PackageJsonExtractor implements FileExtractor {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public boolean supports(String path) {
        return path.endsWith("package.json") && !path.endsWith("package-lock.json");
    }

    @Override
    public String extract(String path, String content) {
        try {
            JsonNode root = MAPPER.readTree(content);

            StringBuilder sb = new StringBuilder();

            appendKeys(sb, "dependencies", root.path("dependencies"));
            appendKeys(sb, "devDependencies", root.path("devDependencies"));
            appendKeys(sb, "scripts", root.path("scripts"));

            JsonNode nodeVersion = root.path("engines").path("node");
            if (nodeVersion.isTextual()) {
                sb.append("node: ").append(nodeVersion.asText()).append("\n");
            }

            return sb.toString();

        } catch (Exception e) {
            log.warn("[package.json 파싱 실패] 경로: {}, 사유: {}", path, e.getMessage());
            return "";
        }
    }

    /** 값은 버리고 키 이름만 수집한다. */
    private void appendKeys(StringBuilder sb, String label, JsonNode node) {
        if (!node.isObject()) return;

        List<String> keys = new ArrayList<>();
        for (Iterator<String> it = node.fieldNames(); it.hasNext(); ) {
            keys.add(it.next());
        }
        if (keys.isEmpty()) return;

        sb.append(label).append(": ")
                .append(String.join(", ", keys))
                .append("\n");
    }
}