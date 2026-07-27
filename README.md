# S15P11D202 - Ait

AI 모의면접 훈련 및 화상 면접 스터디 서비스. `be`(Spring Boot), `ai`(FastAPI), `fe`(React) 세 프로젝트로 구성됩니다.

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

## AI (`ai/`) - FastAPI

```bash
cd ai
cp .env.example .env      # GMS_KEY 등 입력
docker compose up --build
```

→ http://localhost:8000/docs (Swagger)

첫 빌드 시 한국어 임베딩 모델(`jhgan/ko-sroberta-multitask`)을 다운로드/캐시합니다.

## Frontend (`fe/`) - Vite + React + TypeScript

```bash
cd fe
npm install
npm run dev
```

→ http://localhost:5173

기타 명령어: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run preview`
