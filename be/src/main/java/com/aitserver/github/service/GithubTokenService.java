package com.aitserver.github.service;

import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import java.util.Date;
import java.util.Map;

@Service
public class GithubTokenService {

    @Value("${GITHUB_AIT_ID}")
    private String githubAppId;

    // 환경변수나 Secret Manager에서 주입받은 Private Key (PKCS#8 포맷)
    @Value("${GITHUB_AIT_PRIVATE}")
    private String privateKeyString;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 최종 목적: Installation Access Token 발급
     */
    public String getInstallationAccessToken(String installationId) throws Exception {
        // 1. JWT 생성
        String jwt = generateGithubAppJwt();

        // 2. GitHub API 호출 설정
        String url = "https://api.github.com/app/installations/" + installationId + "/access_tokens";

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwt); // "Authorization: Bearer <JWT>"
        headers.set("Accept", "application/vnd.github+json");
        headers.set("X-GitHub-Api-Version", "2022-11-28");

        HttpEntity<String> entity = new HttpEntity<>(headers);

        // 3. API 호출 및 토큰 파싱
        ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                Map.class
        );

        if (response.getStatusCode() == HttpStatus.CREATED && response.getBody() != null) {
            return (String) response.getBody().get("token");
        } else {
            throw new RuntimeException("GitHub Installation Token 발급 실패");
        }
    }

    /**
     * GitHub App 인증용 JWT 생성
     */
    private String generateGithubAppJwt() throws Exception {
        long nowMillis = System.currentTimeMillis();

        // GitHub 권장사항: 서버 간 시계 오차(Clock drift)를 고려해 발행 시간을 60초 전으로 설정
        Date now = new Date(nowMillis - 60000);
        // JWT 만료 시간은 최대 10분 (600,000ms)
        Date exp = new Date(nowMillis + (10 * 60 * 1000));

        PrivateKey privateKey = getPrivateKeyFromString(privateKeyString);

        return Jwts.builder()
                .setIssuer(githubAppId)
                .setIssuedAt(now)
                .setExpiration(exp)
                .signWith(privateKey)
                .compact();
    }

    /**
     * String 형태의 PEM 키를 Java PrivateKey 객체로 변환
     */
    private PrivateKey getPrivateKeyFromString(String key) throws Exception {
        // PEM 헤더, 푸터, 줄바꿈 제거
        String privateKeyPEM = key
                .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                .replace("-----END RSA PRIVATE KEY-----", "")
                .replaceAll("\\s", "");

        byte[] encoded = Base64.getDecoder().decode(privateKeyPEM);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encoded);

        return keyFactory.generatePrivate(keySpec);
    }
}