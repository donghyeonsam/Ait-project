package com.aitserver.dashboard.service;


import com.aitserver.dashboard.dto.DashboardResponse;

public interface DashboardService {
    DashboardResponse getDashboardResponse(Long userId);
}
