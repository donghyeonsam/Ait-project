package com.aitserver.github.extractor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Component
public class GithubActionsExtractor implements FileExtractor {

    private static final ObjectMapper YAML_MAPPER = new ObjectMapper(new YAMLFactory());

    /** 그대로 노출해도 안전한 공식 러너 라벨 */
    private static final Set<String> KNOWN_RUNNERS = Set.of(
            "ubuntu-latest", "ubuntu-24.04", "ubuntu-22.04", "ubuntu-20.04",
            "windows-latest", "windows-2022", "windows-2019",
            "macos-latest", "macos-14", "macos-13"
    );

    @Override
    public boolean supports(String path) {
        String normalized = path.startsWith("./") ? path.substring(2) : path;
        if (!normalized.startsWith(".github/workflows/")) return false;
        return normalized.endsWith(".yml") || normalized.endsWith(".yaml");
    }

    @Override
    public int maxFiles() {
        return 3;
    }

    @Override
    public String extract(String path, String content) {
        try {
            JsonNode root = YAML_MAPPER.readTree(content);
            if (!root.isObject()) return "";

            StringBuilder sb = new StringBuilder();

            appendTriggers(sb, root);
            appendJobs(sb, root);

            return sb.toString();

        } catch (Exception e) {
            log.warn("[workflow 파싱 실패] 경로: {}, 사유: {}", path, e.getMessage());
            return "";
        }
    }

    /** on: 트리거. YAML 1.1 불리언 해석으로 키가 "true"가 되는 경우를 함께 처리한다. */
    private void appendTriggers(StringBuilder sb, JsonNode root) {
        JsonNode on = root.path("on");
        if (on.isMissingNode() || on.isNull()) {
            on = root.path("true");
        }
        if (on.isMissingNode() || on.isNull()) return;

        Set<String> triggers = new LinkedHashSet<>();

        if (on.isTextual()) {
            triggers.add(on.asText());
        } else if (on.isArray()) {
            for (JsonNode node : on) {
                if (node.isTextual()) triggers.add(node.asText());
            }
        } else if (on.isObject()) {
            // 이벤트 이름(키)만 취한다. branches/paths 같은 값은 읽지 않는다.
            for (Iterator<String> it = on.fieldNames(); it.hasNext(); ) {
                triggers.add(it.next());
            }
        }

        if (!triggers.isEmpty()) {
            sb.append("triggers: ").append(String.join(", ", triggers)).append("\n");
        }
    }

    private void appendJobs(StringBuilder sb, JsonNode root) {
        JsonNode jobs = root.path("jobs");
        if (!jobs.isObject()) return;

        List<String> lines = new ArrayList<>();

        for (Iterator<String> it = jobs.fieldNames(); it.hasNext(); ) {
            String jobName = it.next();
            JsonNode job = jobs.path(jobName);
            if (!job.isObject()) continue;

            // 이 아래에서 접근하는 키는 runs-on / needs / steps[].uses / services[].image 뿐이다.
            // run, env, with, secrets, environment 는 읽지 않는다.
            lines.add(describeJob(jobName, job));
        }

        if (!lines.isEmpty()) {
            sb.append("jobs:\n  ").append(String.join("\n  ", lines)).append("\n");
        }
    }

    private String describeJob(String jobName, JsonNode job) {
        StringBuilder sb = new StringBuilder(jobName);

        String runner = runnerLabel(job.path("runs-on"));
        if (runner != null) {
            sb.append(" [").append(runner).append("]");
        }

        Set<String> needs = textValues(job.path("needs"));
        if (!needs.isEmpty()) {
            sb.append(" | needs: ").append(String.join(",", needs));
        }

        Set<String> uses = stepActions(job.path("steps"));
        if (!uses.isEmpty()) {
            sb.append(" | uses: ").append(String.join(", ", uses));
        }

        Set<String> services = serviceImages(job.path("services"));
        if (!services.isEmpty()) {
            sb.append(" | services: ").append(String.join(", ", services));
        }

        return sb.toString();
    }

    /**
     * 공식 러너 라벨만 그대로 노출한다.
     * self-hosted 러너 라벨에는 사내 머신명이나 환경명이 들어가는 경우가 있어 일반화한다.
     */
    private String runnerLabel(JsonNode node) {
        Set<String> labels = new LinkedHashSet<>();

        if (node.isTextual()) {
            labels.add(node.asText());
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                if (child.isTextual()) labels.add(child.asText());
            }
        } else {
            return null; // group/labels 객체 문법은 읽지 않는다
        }

        if (labels.isEmpty()) return null;

        for (String label : labels) {
            if (KNOWN_RUNNERS.contains(label.toLowerCase())) {
                return label;
            }
        }
        return "self-hosted";
    }

    /** steps[].uses 만 수집한다. run/with/env 는 접근하지 않는다. */
    private Set<String> stepActions(JsonNode steps) {
        Set<String> actions = new LinkedHashSet<>();
        if (!steps.isArray()) return actions;

        for (JsonNode step : steps) {
            JsonNode uses = step.path("uses");
            if (!uses.isTextual()) continue;

            String value = uses.asText().trim();
            String sanitized = sanitizeUses(value);
            if (!sanitized.isBlank()) {
                actions.add(sanitized);
            }
        }
        return actions;
    }

    /**
     * docker://registry/image 형태와 로컬 액션 경로를 일반화한다.
     * owner/action@version 형태는 공개 마켓플레이스 액션이므로 그대로 둔다.
     */
    private String sanitizeUses(String value) {
        if (value.startsWith("docker://")) return "(docker action)";
        if (value.startsWith("./") || value.startsWith("../")) return "(local action)";
        if (value.contains("${{")) return "";
        return value;
    }

    private Set<String> serviceImages(JsonNode services) {
        Set<String> images = new LinkedHashSet<>();
        if (!services.isObject()) return images;

        for (Iterator<String> it = services.fieldNames(); it.hasNext(); ) {
            JsonNode image = services.path(it.next()).path("image");
            if (image.isTextual()) {
                String sanitized = stripRegistryHost(image.asText());
                if (!sanitized.isBlank()) images.add(sanitized);
            }
        }
        return images;
    }

    private Set<String> textValues(JsonNode node) {
        Set<String> result = new LinkedHashSet<>();
        if (node.isTextual()) {
            result.add(node.asText());
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                if (child.isTextual()) result.add(child.asText());
            }
        }
        return result;
    }

    /** 사설 레지스트리 호스트 제거 */
    private String stripRegistryHost(String image) {
        if (image.startsWith("$")) return "(variable)";

        int slash = image.indexOf('/');
        if (slash < 0) return image;

        String head = image.substring(0, slash);
        boolean isHost = head.contains(".") || head.contains(":") || head.equals("localhost");

        return isHost ? image.substring(image.lastIndexOf('/') + 1) : image;
    }
}