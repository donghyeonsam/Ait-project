# Ait Frontend

Ait(AI 모의면접 플랫폼)의 Vite + React + TypeScript 기반 프론트엔드입니다. 로그인·OAuth, 대시보드, AI 모의면접, 스터디(LiveKit 화상 세션 포함), 이력서·자소서 작성, 커뮤니티, 마이페이지 등 주요 화면이 구현되어 있습니다.

## 실행 방법

Node.js와 npm이 설치된 환경에서 실행합니다.

```bash
npm install
npm run dev
```

기본 개발 서버 주소는 `http://localhost:5173`입니다.

```bash
npm run lint       # ESLint 검사
npm run typecheck  # TypeScript 타입 검사
npm run test       # Vitest 테스트 실행
npm run build      # 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
```

## 기술 구성

- Vite 8 + React 19 + TypeScript
- Tailwind CSS 4 (`@tailwindcss/vite`)
- shadcn/ui 구조(new-york, CSS variables)와 Radix UI primitives, `class-variance-authority`, `tailwind-merge`
- React Router
- Lucide React
- Pretendard Variable
- GSAP(`gsap`, `@gsap/react`), Framer Motion(`motion`) — 랜딩 등 진입·수치 모션
- Three.js(`three`, `@react-three/fiber`) — 랜딩 3D 연출
- LiveKit(`livekit-client`, `@livekit/components-react`) — 스터디 세션 화상 연결
- MediaPipe Tasks Vision(`@mediapipe/tasks-vision`) — 면접 답변 구간 표정·시선 캡처
- Tiptap(`@tiptap/react` 등) — 이력서·자소서 리치 텍스트 에디터
- `react-hook-form` + `@hookform/resolvers` + `zod` — 폼 상태와 검증
- `@stomp/stompjs` + `sockjs-client` — 스터디 그룹톡 등 실시간 통신
- `dompurify` — 사용자 입력 HTML sanitize
- Vitest + Testing Library + jsdom — 단위/컴포넌트 테스트

Pretendard는 공식 npm 패키지 `pretendard@1.3.9`의 `dist/web/variable/pretendardvariable-dynamic-subset.css`를 사용합니다. 폰트는 자체 호스팅되며, 자주 쓰이는 한글과 기본 라틴 문자가 포함된 `PretendardVariable.subset.91.woff2`를 preload합니다. 패키지의 `@font-face`와 preload용 선언 모두 `font-display: swap`을 적용합니다.

## 디렉터리 구조

```text
src/
  api/                 # 백엔드 REST/OAuth 연동 모듈 (auth, community, study-*, ai-interviews, resume 등)
  app/                 # 라우터, 인증 프로바이더(AuthProvider), route guard, 전역 컨텍스트
  assets/              # 소스에서 import하는 폰트·이미지
  components/
    auth/              # 로그인·회원가입 UI
    common/            # 프로젝트 공통 컴포넌트
    community/         # 커뮤니티 도메인 UI
    dashboard/         # 대시보드 도메인 UI
    documents/         # 이력서·자소서 에디터 UI
    editor/            # 리치 텍스트 에디터(Tiptap) 관련 UI
    form/              # 공통 폼 컨트롤
    icons/             # 커스텀 아이콘
    interview/         # AI 모의면접 도메인 UI
    landing/           # 랜딩 페이지 섹션
    layout/            # Header, Footer, PageLayout, NotificationBell
    mypage/            # 마이페이지 도메인 UI
    reactbits/         # 진입·수치 모션 컴포넌트
    study/             # 스터디(화상 세션 포함) 도메인 UI
    ui/                # Ait 토큰으로 재정의한 shadcn/ui 컴포넌트
  lib/                 # 훅과 유틸리티 (useAuth, OAuth 헬퍼, format 등)
  mocks/               # 화면 확인용 목업 데이터
  pages/               # 라우트 단위 페이지
  styles/              # globals.css와 디자인 토큰
  test/                # Vitest 전역 설정
  types/               # 공통 타입
```

## 라우트

인증이 필요한 화면은 `ProtectedRoute`로 보호되며, 비로그인 상태로 접근하면 `/login`으로 이동 후 원래 경로(`state.from`)로 복귀합니다. `/login`, `/signup`, OAuth 콜백은 반대로 로그인 상태에서 접근하면 `/dashboard`로 이동합니다.

| 경로 | 페이지 | 접근 |
| --- | --- | --- |
| `/` | 로그인 여부에 따라 랜딩 페이지 또는 `/dashboard`로 분기 | 공개 |
| `/dashboard` | 로그인 후 홈 대시보드 | 보호 |
| `/dashboard/interviews` | 대시보드 - 면접 현황 | 보호 |
| `/dashboard/study` | 대시보드 - 스터디 현황 | 보호 |
| `/interviews` | AI 모의면접 | 보호 |
| `/interviews/session` | AI 모의면접 세션 | 보호 |
| `/study` | 스터디 라운지 | 보호 |
| `/study/groups/:studyId` | 스터디 그룹 상세 | 보호 |
| `/study/groups/:studyId/materials` | 스터디 자료실 | 보호 |
| `/study/groups/:groupId/session/prejoin` | 스터디 세션 입장 전 장치 점검 | 보호 |
| `/study/session/:sessionId/room` | 스터디 화상 세션(LiveKit) | 보호 |
| `/community` | 커뮤니티 | 보호 |
| `/community/write` | 커뮤니티 글쓰기 | 보호 |
| `/community/posts/:postId` | 커뮤니티 게시글 | 보호 |
| `/community/posts/:postId/edit` | 커뮤니티 글 수정 | 보호 |
| `/github/callback` | 깃허브 연동 콜백 | 보호 |
| `/mypage` | 마이페이지 | 보호 |
| `/mypage/documents/resume` | 이력서 | 보호 |
| `/mypage/documents/cover-letters/new` | 자소서 작성 | 보호 |
| `/mypage/documents/cover-letters/:coverLetterId` | 자소서 상세·수정 | 보호 |
| `/login` | 로그인 | 비로그인 전용 |
| `/signup` | 회원가입 | 비로그인 전용 |
| `/oauth/google/callback` | 구글 OAuth 콜백 | 비로그인 전용 |
| `/oauth/github/callback` | 깃허브 OAuth 콜백 | 비로그인 전용 |
| `/terms` | 이용약관 | 공개 |
| `/privacy` | 개인정보처리방침 | 공개 |
| `/recording-notice` | 녹화 · AI 분석 안내 | 공개 |
| `*` | 404 | 공개 |

이 외에 `/landingpage`, `/ladingpage`, `/mypage/documents`는 각각 `/`, `/`, `/mypage`로 리다이렉트되는 별칭 경로입니다.

## 토큰 사용 규칙

`docs/design-system.md`가 단일 진실 공급원입니다. 토큰은 [globals.css](./src/styles/globals.css)에 정의되어 있습니다.

1. 컴포넌트에 raw hex, 임의 간격, 임의 radius 또는 `box-shadow`를 직접 작성하지 않습니다.
2. `raw value → Ait semantic CSS variable → Tailwind utility` 흐름을 유지합니다.
3. 색상 이름은 문서의 의미를 그대로 보존합니다. 예: `color/action/primary` → `--color-action-primary` → `bg-action-primary`.
4. shadcn 호환 변수(`--primary`, `--background` 등)는 Ait semantic token을 참조하는 alias일 뿐 원본 토큰을 대체하지 않습니다.
5. Tailwind 기본 spacing scale은 유지하지만 제품 코드에서는 문서가 승인한 `1 / 2 / 3 / 4 / 6 / 8 / 10`만 사용합니다. `p-5`, `gap-7`, `mt-9` 같은 비승인 간격은 사용하지 않습니다.
6. 그림자는 `shadow-elevation-1`, `shadow-elevation-2`, `shadow-elevation-3`만 사용합니다.
7. 타이포그래피는 `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body-1`, `text-body-2`, `text-caption`을 사용합니다.
8. 숫자 전용 표기는 Tailwind의 `tabular-nums`를 사용합니다.
9. 모션은 `--duration-*`, `--easing-*` 변수를 사용하며 reduced-motion 환경에서는 모두 비활성화됩니다.
10. 다크 모드는 아직 제공하지 않으며, 향후 동일 semantic variable을 테마 선택자에서 재정의할 수 있습니다.

### shadcn/ui Ait 매핑

| shadcn 기준 | Ait 구현 |
| --- | --- |
| Base / Primary | `color/action/primary` |
| Accent | `color/status/achievement` |
| Radius | S 8 / M 12 / L 16 / Pill 999px |
| Focus ring | Navy 25%, 3px |
| Shadow | `elevation-1/2/3` |
| Font | Pretendard Variable |
| Destructive | `color/status/error` |

상태 UI는 `color/status/{status}`, `-surface`, `-border` 세 토큰을 함께 사용합니다. 성취 색상은 승인된 결과 맥락에서만 사용합니다.
