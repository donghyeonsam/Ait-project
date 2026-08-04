package com.aitserver.dashboard.controller;

import com.aitserver.dashboard.dto.DashboardResponse;
import com.aitserver.dashboard.repository.DashboardRepository;
import com.aitserver.dashboard.service.DashboardService;
import com.aitserver.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dashboard/")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(
            @AuthenticationPrincipal Long userId,
            HttpServletRequest request
    ){

        DashboardResponse dashboardResponse = dashboardService.getDashboardResponse(userId);

        return ResponseEntity
                .status(HttpStatus.OK)
                .body(ApiResponse.success(
                        HttpStatus.OK,
                        "dashboard 정보 조회에 성공했습니다.",
                        dashboardResponse,
                        request
                ));
    }




}
