package com.aitserver.community.service;

import com.aitserver.community.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TagService {

    private final TagRepository tagRepository; // 상황에 맞게 주입

    /**
     * 최근 7일간 가장 많이 등록된 태그 Top 10 조회
     */
    public List<String> getTrendingTags() {
        // 기준 시간: 현재 시간으로부터 7일 전
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);

        // LIMIT 설정: 0페이지, 10개
        Pageable topTen = PageRequest.of(0, 10);

        // 쿼리 실행 및 태그 이름 리스트 반환
        return tagRepository.findTrendingTagNames(sevenDaysAgo, topTen);
    }
}