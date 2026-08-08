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
public class DockerComposeExtractor implements FileExtractor {

    private static final ObjectMapper YAML_MAPPER = new ObjectMapper(new YAMLFactory());

    @Override
    public boolean supports(String path) {
        String name = fileName(path);
        boolean isYaml = name.endsWith(".yml") || name.endsWith(".yaml");
        if (!isYaml) return false;

        return name.startsWith("docker-compose") || name.startsWith("compose");
    }

    @Override
    public int maxFiles() {
        return 3; // dev / prod / override
    }

    @Override
    public String extract(String path, String content) {
        try {
            JsonNode root = YAML_MAPPER.readTree(content);
            JsonNode services = root.path("services");

            if (!services.isObject()) {
                return "";
            }

            List<String> lines = new ArrayList<>();

            for (Iterator<String> it = services.fieldNames(); it.hasNext(); ) {
                String serviceName = it.next();
                JsonNode service = services.path(serviceName);
                if (!service.isObject()) continue;

                // 이 아래에서 접근하는 키는 image / ports / depends_on 뿐이다.
                // environment, env_file, volumes, command, labels 는 읽지 않는다.
                lines.add(describeService(serviceName, service));
            }

            if (lines.isEmpty()) return "";

            return "services:\n  " + String.join("\n  ", lines) + "\n";

        } catch (Exception e) {
            log.warn("[docker-compose 파싱 실패] 경로: {}, 사유: {}", path, e.getMessage());
            return "";
        }
    }

    private String describeService(String serviceName, JsonNode service) {
        StringBuilder sb = new StringBuilder(serviceName).append(" -> ");

        JsonNode image = service.path("image");
        if (image.isTextual()) {
            sb.append(stripRegistryHost(image.asText()));
        } else if (service.has("build")) {
            sb.append("(locally built)"); // build 경로는 읽지 않는다
        } else {
            sb.append("(unknown)");
        }

        Set<String> ports = containerPorts(service.path("ports"));
        if (!ports.isEmpty()) {
            sb.append(" | ports: ").append(String.join(",", ports));
        }

        Set<String> dependsOn = dependsOn(service.path("depends_on"));
        if (!dependsOn.isEmpty()) {
            sb.append(" | dependsOn: ").append(String.join(",", dependsOn));
        }

        return sb.toString();
    }

    /**
     * 컨테이너 포트만 남긴다.
     * "127.0.0.1:3306:3306" 처럼 호스트 바인딩 주소가 들어가는 경우가 있어
     * 마지막 구간(컨테이너 포트)만 취한다.
     */
    private Set<String> containerPorts(JsonNode portsNode) {
        Set<String> ports = new LinkedHashSet<>();
        if (!portsNode.isArray()) return ports;

        for (JsonNode node : portsNode) {
            if (!node.isValueNode()) continue; // long syntax(객체)는 건너뛴다

            String value = node.asText().trim();
            String last = value.substring(value.lastIndexOf(':') + 1);
            String portOnly = last.split("/")[0];

            if (portOnly.matches("^\\d+$")) {
                ports.add(portOnly);
            }
        }
        return ports;
    }

    /** depends_on 은 짧은 문법(배열)과 긴 문법(객체) 둘 다 가능하다. */
    private Set<String> dependsOn(JsonNode node) {
        Set<String> result = new LinkedHashSet<>();

        if (node.isArray()) {
            for (JsonNode child : node) {
                if (child.isTextual()) result.add(child.asText());
            }
        } else if (node.isObject()) {
            for (Iterator<String> it = node.fieldNames(); it.hasNext(); ) {
                result.add(it.next());
            }
        }
        return result;
    }

    /** 사설 레지스트리 호스트 제거 (AWS 계정 ID, 리전 노출 방지) */
    private String stripRegistryHost(String image) {
        if (image.startsWith("$")) return "(variable)";

        int slash = image.indexOf('/');
        if (slash < 0) return image;

        String head = image.substring(0, slash);
        boolean isHost = head.contains(".") || head.contains(":") || head.equals("localhost");

        return isHost ? image.substring(image.lastIndexOf('/') + 1) : image;
    }

    private String fileName(String path) {
        int idx = path.lastIndexOf('/');
        return idx < 0 ? path : path.substring(idx + 1);
    }
}