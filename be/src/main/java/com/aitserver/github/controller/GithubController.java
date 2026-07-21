package com.aitserver.github.controller;

import com.aitserver.github.service.GithubTokenService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class GithubController {

    private final GithubTokenService githubTokenService;
    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 1. 깃허브가 호출하는 Callback API
     * 유저가 깃허브에서 설치를 마치면 여기로 리다이렉트 됩니다.
     */
    @GetMapping("/github/callback")
    public void githubCallback(@RequestParam("installation_id") String installationId,
                               HttpServletResponse response) throws IOException {

        // MVP: 일단 DB 저장 대신 로그로 확인
        System.out.println("깃허브가 던져준 Installation ID: " + installationId);

        // TODO: 실제로는 SecurityContext에서 현재 로그인한 유저를 찾아 DB에 installationId를 저장해야 합니다.

        // 프론트엔드 화면으로 다시 튕겨보냄 (URL 파라미터로 ID를 임시로 달아줌)
        //response.sendRedirect("http://localhost:3000/mypage?installation_id=" + installationId);
    }

}
