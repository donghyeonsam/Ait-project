package com.aitserver.resume.analysis.service;

import com.aitserver.resume.dto.ResumeUpdateRequest;
import com.aitserver.resume.entity.Resume;
import com.aitserver.resume.entity.ResumeCareer;
import com.aitserver.resume.entity.ResumeProject;
import com.aitserver.resume.entity.ResumeTraining;
import org.apache.commons.text.similarity.LevenshteinDistance;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

@Component
public class ResumeChangeDetector {

    private static final double ANALYSIS_THRESHOLD = 0.10;

    private static final LevenshteinDistance LEVENSHTEIN_DISTANCE =
            LevenshteinDistance.getDefaultInstance();

    private static final Pattern WHITESPACE_PATTERN =
            Pattern.compile("\\s+");

    public boolean isSignificantChange(
            Resume original,
            ResumeUpdateRequest edited
    ) {
        /*
         * 교육·프로젝트·경력 개수가 달라졌다면
         * 항목이 추가되거나 삭제된 것이므로 무조건 재분석한다.
         */
        if (original.getTrainings().size()
                != edited.trainings().size()) {
            return true;
        }

        if (original.getProjects().size()
                != edited.projects().size()) {
            return true;
        }

        if (original.getCareers().size()
                != edited.careers().size()) {
            return true;
        }

        /*
         * 엔티티를 수정하거나 컬렉션을 clear하기 전에
         * 기존 데이터와 수정 요청 데이터를 문자열로 변환한다.
         */
        String originalText = createOriginalText(original);
        String editedText = createEditedText(edited);

        int maxLength = Math.max(
                originalText.length(),
                editedText.length()
        );

        // 양쪽 모두 비어 있으면 변경 없음
        if (maxLength == 0) {
            return false;
        }

        int distance = LEVENSHTEIN_DISTANCE.apply(
                originalText,
                editedText
        );

        double changeRatio =
                (double) distance / maxLength;

        return changeRatio >= ANALYSIS_THRESHOLD;
    }

    /**
     * DB에 저장된 기존 이력서 데이터를
     * 비교 가능한 하나의 문자열로 변환한다.
     */
    private String createOriginalText(Resume resume) {
        List<String> lines = new ArrayList<>();

        for (ResumeTraining training : resume.getTrainings()) {
            lines.add(createLine(
                    "TRAINING",
                    training.getStartDate(),
                    training.getEndDate(),
                    training.getOrganization(),
                    training.getCourse(),
                    training.getDescription()
            ));
        }

        for (ResumeProject project : resume.getProjects()) {
            lines.add(createLine(
                    "PROJECT",
                    project.getProjectName(),
                    project.getTechStacks(),
                    project.getRole(),
                    project.getDescription()
            ));
        }

        for (ResumeCareer career : resume.getCareers()) {
            lines.add(createLine(
                    "CAREER",
                    career.getStartDate(),
                    career.getEndDate(),
                    career.getCompanyName(),
                    career.getRole(),
                    career.getDescription()
            ));
        }

        /*
         * 프론트가 배열 순서만 바꿔서 보내는 경우
         * 불필요하게 변경으로 판단하지 않도록 정렬한다.
         */
        Collections.sort(lines);

        return String.join("\n", lines);
    }

    /**
     * 수정 요청으로 들어온 이력서 데이터를
     * 비교 가능한 하나의 문자열로 변환한다.
     */
    private String createEditedText(
            ResumeUpdateRequest request
    ) {
        List<String> lines = new ArrayList<>();

        request.trainings().forEach(training ->
                lines.add(createLine(
                        "TRAINING",
                        training.startDate(),
                        training.endDate(),
                        training.organization(),
                        training.course(),
                        training.description()
                ))
        );

        request.projects().forEach(project ->
                lines.add(createLine(
                        "PROJECT",
                        project.projectName(),
                        project.techStacks(),
                        project.role(),
                        project.description()
                ))
        );

        request.careers().forEach(career ->
                lines.add(createLine(
                        "CAREER",
                        career.startDate(),
                        career.endDate(),
                        career.companyName(),
                        career.role(),
                        career.description()
                ))
        );

        Collections.sort(lines);

        return String.join("\n", lines);
    }

    /**
     * 각 교육·프로젝트·경력 항목을 한 줄의 표준 문자열로 만든다.
     */
    private String createLine(
            String type,
            Object... values
    ) {
        StringBuilder builder = new StringBuilder(type);

        for (Object value : values) {
            builder.append('|')
                    .append(normalize(value));
        }

        return builder.toString();
    }

    /**
     * null, 불필요한 공백, 유니코드 표현 차이를 정규화한다.
     */
    private String normalize(Object value) {
        if (value == null) {
            return "";
        }

        String normalized = Normalizer.normalize(
                String.valueOf(value),
                Normalizer.Form.NFC
        );

        return WHITESPACE_PATTERN
                .matcher(normalized.strip())
                .replaceAll(" ");
    }
}