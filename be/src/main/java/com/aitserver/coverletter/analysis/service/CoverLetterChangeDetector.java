package com.aitserver.coverletter.analysis.service;

import com.aitserver.coverletter.dto.CoverLetterContentUpdateRequest;
import com.aitserver.coverletter.dto.CoverLetterUpdateRequest;
import com.aitserver.coverletter.entity.CoverLetter;
import com.aitserver.coverletter.entity.CoverLetterContent;
import org.apache.commons.text.similarity.LevenshteinDistance;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Comparator;
import java.util.regex.Pattern;

@Component
public class CoverLetterChangeDetector {

    private static final double ANALYSIS_THRESHOLD = 0.10;

    private static final LevenshteinDistance LEVENSHTEIN_DISTANCE =
            LevenshteinDistance.getDefaultInstance();

    private static final Pattern WHITESPACE_PATTERN =
            Pattern.compile("\\s+");

    public boolean isSignificantChange(
            CoverLetter original,
            CoverLetterUpdateRequest edited
    ) {
        // 문항 개수가 달라진다면 무조건 검사
        if (original.getContents().size()
                != edited.getCoverLetterContents().size()) {
            return true;
        }

        // 텍스트 추출
        String originalText = createOriginalText(original);
        String editedText = createEditedText(edited);

        // 기준길이 측정
        int maxLength = Math.max(
                originalText.length(),
                editedText.length()
        );

        // 양쪽 모두 비어 있으면 변경되지 않은 것으로 처리
        if (maxLength == 0) {
            return false;
        }

        // 편집거리 계산
        int distance = LEVENSHTEIN_DISTANCE.apply(
                originalText,
                editedText
        );

        // 변경 비율 계산
        double changeRatio =
                (double) distance / maxLength;

        return changeRatio >= ANALYSIS_THRESHOLD;
    }

    /**
     * DB에 저장된 기존 자기소개서를
     * 비교 가능한 하나의 문자열로 변환한다.
     */
    private String createOriginalText(
            CoverLetter coverLetter
    ) {
        StringBuilder builder = new StringBuilder();

        appendField(
                builder,
                "title",
                coverLetter.getTitle()
        );
        appendField(
                builder,
                "companyName",
                coverLetter.getCompanyName()
        );
        appendField(
                builder,
                "role",
                coverLetter.getRole()
        );

        coverLetter.getContents().stream()
                .sorted(
                        Comparator.comparing(
                                CoverLetterContent::getContentOrder
                        )
                )
                .forEach(content -> {
                    appendField(
                            builder,
                            "contentOrder",
                            String.valueOf(content.getContentOrder())
                    );
                    appendField(
                            builder,
                            "question",
                            content.getQuestion()
                    );
                    appendField(
                            builder,
                            "answer",
                            content.getAnswer()
                    );
                });

        return builder.toString();
    }

    /**
     * 수정 요청으로 들어온 자기소개서를
     * 비교 가능한 하나의 문자열로 변환한다.
     */
    private String createEditedText(
            CoverLetterUpdateRequest request
    ) {
        StringBuilder builder = new StringBuilder();

        appendField(
                builder,
                "title",
                request.getTitle()
        );
        appendField(
                builder,
                "companyName",
                request.getCompanyName()
        );
        appendField(
                builder,
                "role",
                request.getRole()
        );

        request.getCoverLetterContents().stream()
                .sorted(
                        Comparator.comparing(
                                CoverLetterContentUpdateRequest
                                        ::getContentOrder
                        )
                )
                .forEach(content -> {
                    appendField(
                            builder,
                            "contentOrder",
                            String.valueOf(
                                    content.getContentOrder()
                            )
                    );
                    appendField(
                            builder,
                            "question",
                            content.getQuestion()
                    );
                    appendField(
                            builder,
                            "answer",
                            content.getAnswer()
                    );
                });

        return builder.toString();
    }

    private void appendField(
            StringBuilder builder,
            String fieldName,
            String value
    ) {
        builder.append(fieldName)
                .append('=')
                .append(normalize(value))
                .append('\n');
    }

    /**
     * 불필요한 공백이나 유니코드 표현 차이로 인해
     * 변경 비율이 과도하게 높게 계산되는 것을 방지한다.
     */
    private String normalize(String value) {
        if (value == null) {
            return "";
        }

        String normalized = Normalizer.normalize(
                value,
                Normalizer.Form.NFC
        );

        normalized = WHITESPACE_PATTERN
                .matcher(normalized.strip())
                .replaceAll(" ");

        return normalized;
    }
}