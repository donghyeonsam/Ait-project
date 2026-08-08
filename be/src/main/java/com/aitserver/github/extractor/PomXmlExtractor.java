package com.aitserver.github.extractor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashSet;
import java.util.Set;

@Slf4j
@Component
public class PomXmlExtractor implements FileExtractor {

    /** properties 중 읽어도 안전한 키만 허용 */
    private static final Set<String> ALLOWED_PROPERTIES = Set.of(
            "java.version",
            "maven.compiler.source",
            "maven.compiler.target",
            "maven.compiler.release",
            "kotlin.version"
    );

    @Override
    public boolean supports(String path) {
        return fileName(path).equals("pom.xml");
    }

    @Override
    public int maxFiles() {
        return 5; // 멀티모듈 대비
    }

    @Override
    public String extract(String path, String content) {
        try {
            Document doc = parseSafely(content);
            StringBuilder sb = new StringBuilder();

            appendParent(sb, doc);
            appendPackaging(sb, doc);
            appendDependencies(sb, doc);
            appendPlugins(sb, doc);
            appendProperties(sb, doc);

            return sb.toString();

        } catch (Exception e) {
            log.warn("[pom.xml 파싱 실패] 경로: {}, 사유: {}", path, e.getMessage());
            return "";
        }
    }

    /** XXE 차단 설정을 적용한 파서 */
    private Document parseSafely(String content) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);

        DocumentBuilder builder = factory.newDocumentBuilder();
        return builder.parse(new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));
    }

    private void appendParent(StringBuilder sb, Document doc) {
        NodeList parents = doc.getElementsByTagName("parent");
        if (parents.getLength() == 0) return;

        Element parent = (Element) parents.item(0);
        String artifactId = childText(parent, "artifactId");
        if (artifactId == null) return;

        sb.append("parent: ").append(artifactId);
        String version = childText(parent, "version");
        if (version != null) {
            sb.append(":").append(version);
        }
        sb.append("\n");
    }

    private void appendPackaging(StringBuilder sb, Document doc) {
        String packaging = childText(doc.getDocumentElement(), "packaging");
        if (packaging != null) {
            sb.append("packaging: ").append(packaging).append("\n");
        }
    }

    private void appendDependencies(StringBuilder sb, Document doc) {
        Set<String> deps = new LinkedHashSet<>();
        NodeList nodes = doc.getElementsByTagName("dependency");

        for (int i = 0; i < nodes.getLength(); i++) {
            Element dep = (Element) nodes.item(i);
            String groupId = childText(dep, "groupId");
            String artifactId = childText(dep, "artifactId");
            if (groupId != null && artifactId != null) {
                deps.add(groupId + ":" + artifactId);
            }
        }

        if (!deps.isEmpty()) {
            sb.append("dependencies: ").append(String.join(", ", deps)).append("\n");
        }
    }

    private void appendPlugins(StringBuilder sb, Document doc) {
        Set<String> plugins = new LinkedHashSet<>();
        NodeList nodes = doc.getElementsByTagName("plugin");

        for (int i = 0; i < nodes.getLength(); i++) {
            String artifactId = childText((Element) nodes.item(i), "artifactId");
            if (artifactId != null) {
                plugins.add(artifactId);
            }
        }

        if (!plugins.isEmpty()) {
            sb.append("plugins: ").append(String.join(", ", plugins)).append("\n");
        }
    }

    private void appendProperties(StringBuilder sb, Document doc) {
        NodeList list = doc.getElementsByTagName("properties");
        if (list.getLength() == 0) return;

        NodeList children = list.item(0).getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node node = children.item(i);
            if (node.getNodeType() != Node.ELEMENT_NODE) continue;

            String name = node.getNodeName();
            if (!ALLOWED_PROPERTIES.contains(name)) continue;

            String value = node.getTextContent();
            if (value != null && !value.isBlank()) {
                sb.append(name).append(": ").append(value.trim()).append("\n");
            }
        }
    }

    /** 자식 노드만 탐색 (exclusions 안쪽 groupId가 섞이지 않도록) */
    private String childText(Element parent, String tagName) {
        NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node node = children.item(i);
            if (node.getNodeType() == Node.ELEMENT_NODE && tagName.equals(node.getNodeName())) {
                String text = node.getTextContent();
                return (text == null || text.isBlank()) ? null : text.trim();
            }
        }
        return null;
    }

    private String fileName(String path) {
        int idx = path.lastIndexOf('/');
        return idx < 0 ? path : path.substring(idx + 1);
    }
}