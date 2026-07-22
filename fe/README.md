# Ait Frontend

Ait(AI 모의면접 플랫폼)의 Vite + React + TypeScript 기반 프론트엔드입니다. 현재는 공통 Header, Footer, PageLayout과 빈 라우트만 구성된 초기 스캐폴딩 단계입니다.

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
npm run build      # 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
```

## 기술 구성

- Vite 8 + React 19 + TypeScript
- Tailwind CSS 4 (`@tailwindcss/vite`)
- shadcn/ui 구조(new-york, CSS variables)와 Radix UI primitives
- React Router
- Lucide React
- Pretendard Variable

Pretendard는 공식 npm 패키지 `pretendard@1.3.9`의 `dist/web/variable/pretendardvariable-dynamic-subset.css`를 사용합니다. 폰트는 자체 호스팅되며, 자주 쓰이는 한글과 기본 라틴 문자가 포함된 `PretendardVariable.subset.91.woff2`를 preload합니다. 패키지의 `@font-face`와 preload용 선언 모두 `font-display: swap`을 적용합니다.

## 디렉터리 구조

```text
src/
  app/                 # 라우터, 전역 프로바이더
  pages/               # 라우트 단위 빈 페이지
  components/
    layout/            # Header, Footer, PageLayout
    ui/                # Ait 토큰으로 재정의한 shadcn/ui 컴포넌트
    common/            # 프로젝트 공통 컴포넌트
  lib/                 # cn(), useInView
  styles/              # globals.css와 디자인 토큰
  types/               # 공통 타입
  mocks/               # 추후 화면 확인용 목업 데이터
```

## 라우트

| 경로 | 페이지 |
| --- | --- |
| `/` | 로그인 전 랜딩 페이지(구현 예정) |
| `/dashboard` | 로그인 후 홈인 대시보드 |
| `/interviews` | AI 모의면접 |
| `/study` | 스터디 라운지 |
| `/community` | 커뮤니티 |
| `/terms` | 이용약관 |
| `/privacy` | 개인정보처리방침 |
| `/recording-notice` | 녹화 · AI 분석 안내 |
| `*` | 404 |

`/`와 `/dashboard`는 공개 랜딩과 로그인 후 홈을 구분하기 위해 별도 라우트로 유지합니다. 실제 인증 상태가 도입되면 `/dashboard`를 포함한 서비스 라우트에 인증 Guard를 연결하며, 현재 스캐폴딩에는 가짜 인증 상태나 임시 Guard를 두지 않습니다.

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
