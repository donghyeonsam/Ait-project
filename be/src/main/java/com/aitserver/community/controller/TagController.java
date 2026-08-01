package com.aitserver.community.controller;

import com.aitserver.community.service.TagService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    /**
     * 인기 태그 Top 10 조회 (최근 7일 기준)
     */
    @GetMapping("/trending")
    public ResponseEntity<ApiResponse<List<String>>> getTrendingTags(HttpServletRequest request) {
        // 서비스에서 String 리스트를 바로 받아옴
        List<String> trendingTags = tagService.getTrendingTags();

        return ResponseEntity.ok(
                ApiResponse.success(HttpStatus.OK, "주간 인기 태그 Top 10 조회 성공", trendingTags, request)
        );
    }
}