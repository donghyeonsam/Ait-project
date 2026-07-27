package com.aitserver.coverletter.service;

import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import com.aitserver.coverletter.analysis.event.CoverLetterAnalysisRequestedEvent;
import com.aitserver.coverletter.analysis.service.CoverLetterChangeDetector;
import com.aitserver.coverletter.dto.*;
import com.aitserver.coverletter.entity.CoverLetter;
import com.aitserver.coverletter.entity.CoverLetterContent;
import com.aitserver.coverletter.repository.CoverLetterRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class CoverLetterServiceImpl implements CoverLetterService{

    private final CoverLetterRepository coverLetterRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final CoverLetterChangeDetector coverLetterChangeDetector;

    @Override
    public CoverLetterListResponse getList(Long userId) {

        // 자소서 목록 가져오고
        List<CoverLetter> coverLetters = coverLetterRepository
                .findAllByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(userId);


        List<CoverLetterListResult> response = new ArrayList<>();

        // 배열 채우고
        for (CoverLetter coverLetter : coverLetters) {
            CoverLetterListResult coverLetterListResult = CoverLetterListResult.from(coverLetter);
            response.add(coverLetterListResult);

        }

        // 빌드
        return CoverLetterListResponse.builder()
                .coverLetters(response)
                .totalCount(response.size())
                .build();
    }

    @Override
    public CoverLetterDetailResponse getDetail(Long coverLetterId, Long userId) {

        // 자소서를 가져오고, entitiygraph를 쓰면 설정한 연관 테이블까지 한번에 가져옴 개지리네
        CoverLetter coverLetter = coverLetterRepository
                .findByIdAndUserIdAndDeletedAtIsNull(coverLetterId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.COVER_LETTER_NOT_FOUND));

        // contentresponse 배열을 만든다음
        List<CoverLetterContentResponse> contents = new ArrayList<>();

        // 가져온 자소서에서 꺼내서 채우고
        for (CoverLetterContent coverLetterContent : coverLetter.getContents()) {
            CoverLetterContentResponse coverLetterContentResponse = CoverLetterContentResponse.from(coverLetterContent);
            contents.add(coverLetterContentResponse);
        }

        // detail 빌드
        return CoverLetterDetailResponse.builder()
                .coverLetterId(coverLetter.getId())
                .title(coverLetter.getTitle())
                .companyName(coverLetter.getCompanyName())
                .role(coverLetter.getRole())
                .analysisContent(coverLetter.getAnalysisContent())
                .coverLetterContents(contents)
                .createdAt(coverLetter.getCreatedAt())
                .updatedAt(coverLetter.getUpdatedAt())
                .build();
    }


    // 자소서 생성
    @Transactional
    public CoverLetterDetailResponse createCoverLetter(
            Long userId,
            CoverLetterCreateRequest request
    ) {
        // user검사
        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.USER_NOT_FOUND)
                );


        CoverLetter coverLetter = CoverLetter.builder()
                .user(user)
                .title(request.getTitle())
                .companyName(request.getCompanyName())
                .role(request.getRole())
                .build();

        Set<Integer> contentOrders = new HashSet<>();

        // 중복 검사
        for (CoverLetterContentCreateRequest contentRequest : request.getCoverLetterContents()) {

            boolean added =
                    contentOrders.add(contentRequest.getContentOrder());

            if (!added) {
                throw new BusinessException(
                        ErrorCode.DUPLICATE_COVER_LETTER_CONTENT_ORDER
                );
            }
            // 중복이 아니면 리스트에 넣는다
            CoverLetterContent content =
                    CoverLetterContent.builder()
                            .contentOrder(contentRequest.getContentOrder())
                            .question(contentRequest.getQuestion())
                            .answer(contentRequest.getAnswer())
                            .build();

            coverLetter.addContent(content);
        }



        // 저장
        CoverLetter savedCoverLetter =
                coverLetterRepository.save(coverLetter);

        coverLetterRepository.flush();

        eventPublisher.publishEvent(
                new CoverLetterAnalysisRequestedEvent(
                        savedCoverLetter.getId()
                )
        );

        return CoverLetterDetailResponse.from(savedCoverLetter);
    }

    // 자소서 업데이트, 레빈슈타인 추가
    @Transactional
    public CoverLetterDetailResponse updateCoverLetter(
            Long userId,
            Long coverLetterId,
            CoverLetterUpdateRequest request
    ) {
        CoverLetter coverLetter = coverLetterRepository
                .findByIdAndUserIdAndDeletedAtIsNull(
                        coverLetterId,
                        userId
                )
                .orElseThrow(() ->
                        new BusinessException(
                                ErrorCode.COVER_LETTER_NOT_FOUND
                        )
                );

        validateContentOrders(request.getCoverLetterContents());

        // 변경이 필요한지 검사
        boolean significantChange = coverLetterChangeDetector.isSignificantChange(coverLetter, request);


        // 만약 분석 컬럼이 비어있거나 검사 결과가 true이면 검사 필요
        boolean analysisRequired = coverLetter.getAnalysisContent() == null || coverLetter.getAnalysisContent().isBlank() || significantChange;


        coverLetter.updateBasicInfo(
                request.getTitle(),
                request.getCompanyName(),
                request.getRole()
        );

        // 만약 검사가 필요하다면 기존 검사결과 삭제
        if (analysisRequired) {
            coverLetter.clearAnalysisContent();
        }

        // 기존 문항 전체 제거
        coverLetter.clearContents();

        // delete를 먼저 db에 반영하고 아래 작업을 해야함
        // 안그러면 order가 겹쳐서 충돌
        coverLetterRepository.flush();

        // 요청으로 받은 문항을 전부 새로운 엔티티로 생성
        for (CoverLetterContentUpdateRequest contentRequest
                : request.getCoverLetterContents()) {

            CoverLetterContent content =
                    CoverLetterContent.builder()
                            .contentOrder(contentRequest.getContentOrder())
                            .question(contentRequest.getQuestion())
                            .answer(contentRequest.getAnswer())
                            .build();

            coverLetter.addContent(content);
        }



        /*
         * 새 문항 INSERT와 updatedAt 갱신을 반영한다.
         * IDENTITY 전략인 새 문항의 contentId도 이 시점에 생성된다.
         */
        coverLetterRepository.flush();

        // 검사가 필요하다면 이벤트 발생


        if (analysisRequired) {
            log.info("분석 이벤트 발생");
            eventPublisher.publishEvent(
                    new CoverLetterAnalysisRequestedEvent(
                            coverLetter.getId()
                    )
            );
        }

        return CoverLetterDetailResponse.from(coverLetter);
    }

    private void validateContentOrders(
            List<CoverLetterContentUpdateRequest> contentRequests
    ) {
        Set<Integer> contentOrders = new HashSet<>();

        for (CoverLetterContentUpdateRequest contentRequest
                : contentRequests) {

            Integer contentOrder =
                    contentRequest.getContentOrder();

            boolean added =
                    contentOrders.add(contentOrder);

            if (!added) {
                throw new BusinessException(
                        ErrorCode.DUPLICATE_COVER_LETTER_CONTENT_ORDER
                );
            }
        }
    }

    @Transactional
    public void deleteCoverLetter(
            Long userId,
            Long coverLetterId
    ) {
        CoverLetter coverLetter = coverLetterRepository
                .findDeleteTarget(
                        coverLetterId,
                        userId
                )
                .orElseThrow(() ->
                        new BusinessException(
                                ErrorCode.COVER_LETTER_NOT_FOUND
                        )
                );

        coverLetter.softDelete();
        // save 안해도됨 트랜잭션시에는 영속상태라 coverLetter상태를 자동 변경해줌..?
    }
}
