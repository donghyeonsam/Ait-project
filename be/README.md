# Ait-BE

## Backend (`be/`) - Spring Boot

1. MySQL/Redis 등 인프라 컨테이너 실행

   ```bash
   cd be
   docker compose -f infra/docker-compose.yml up -d
   ```

2. `be/.env`에 `MYSQL_*`, `REDIS_PASSWORD`, `JWT_SECRET_KEY`, `GMS_*`, `GITHUB_AIT_*` 값 설정 (미보유 시 팀 공유 채널 확인)

3. 서버 실행 (Java 21)

   ```bash
   ./gradlew bootRun       # macOS/Linux
   gradlew.bat bootRun     # Windows
   ```

   → Swagger: http://localhost:8080/swagger-ui/index.html