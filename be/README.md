# AIT Backend

AIT 서비스의 백엔드 서버입니다. Spring Boot 기반으로 회원 인증, 커뮤니티, 스터디 그룹, AI 면접, 실시간 알림 및 LiveKit 연동 API를 제공합니다.

## 기술 스택

- Java 21, Spring Boot 4
- Spring Security, Spring Data JPA, QueryDSL
- MySQL 8, Redis 7
- WebSocket, SSE, LiveKit
- Gradle

## 설치 및 실행

### 1. 사전 준비

- JDK 21
- Docker 및 Docker Compose

### 2. 환경 변수 설정

프로젝트 루트의 `.env`에 실행에 필요한 값을 설정합니다. `.env`는 비밀 정보가 포함되므로 Git에 커밋하지 않습니다.

```dotenv
MYSQL_DATABASE=
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_ROOT_PASSWORD=
REDIS_PASSWORD=

JWT_SECRET_KEY=
GMS_BASE_URL=
GMS_API_KEY=
GMS_MODEL=
FASTAPI_URL=
FASTAPI_AUDIOURL=

LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_API_URL=http://localhost:7880
LIVEKIT_WS_URL=ws://localhost:7880

MAIL_USERNAME=
MAIL_APP_PASSWORD=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_ALLOWED_REDIRECT_URIS=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_ALLOWED_REDIRECT_URIS=
GITHUB_WEBHOOK_SECRET=
GITHUB_AIT_ID=
GITHUB_AIT_PRIVATE=
```

애플리케이션 실행 시에도 위 값들이 프로세스 환경 변수로 전달되어야 합니다. IntelliJ를 사용한다면 실행 구성에서 `.env`를 불러오거나 동일한 환경 변수를 등록합니다.

### 3. MySQL 및 Redis 실행

.env 예시
```aiignore
MYSQL_DATABASE=
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_ROOT_PASSWORD=
REDIS_PASSWORD=
```
compose 파일과 같은 위치에 .env 파일 생성 후 

```bash
docker compose infra/docker-compose.yml up -d
```

최초 실행 시 `src/main/resources/schema.sql`을 MySQL에 적용합니다. 필요하다면 `data.sql`도 이어서 적용합니다.



### 4. 서버 실행

macOS/Linux:

```bash
./gradlew bootRun
```

Windows:

```powershell
.\gradlew.bat bootRun
```

서버는 기본적으로 `http://localhost:8080`에서 실행됩니다.

## 사용 방법

- API 문서(Swagger): http://localhost:8080/swagger-ui/index.html
- OpenAPI 명세: http://localhost:8080/v3/api-docs
- 상태 확인: http://localhost:8080/api/test/health

Swagger에서 제공되는 API 목록과 요청 형식을 확인하고 직접 호출할 수 있습니다. 인증이 필요한 API는 로그인 후 발급받은 액세스 토큰을 사용합니다.

LiveKit 기능이 필요한 경우 .env.example을 기반으로 .env 파일 생성 후 별도의 터미널에서 다음 명령을 실행합니다.

```bash
docker compose livekit/docker-compose.yml up -d
```

실행 중인 인프라를 종료하려면 다음 명령을 사용합니다.

```bash
docker compose infra/docker-compose.yml down
docker compose livekit/docker-compose.yml down
```
