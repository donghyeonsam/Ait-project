# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 항상 참고하는 프로젝트 규칙 파일이다.

## 프로젝트 개요

**Ait(에잇)**은 AI 기반 모의면접 훈련 플랫폼이다. 사용자가 화상 면접을 진행하면 AI가 답변, 시선, 표정 등을 분석해 피드백 리포트를 제공한다. SSAFY(Samsung SW Academy For Youth) 6주 팀 프로젝트로 진행 중이며, 프론트엔드/백엔드로 팀이 나뉘어 있다.

## 기술 스택 (목표 구성)

실제 설치 여부와 실행 가능한 명령은 `package.json`을 기준으로 확인한다. 아직 설치되지 않은 기술은 관련 작업에서 팀의 요청이나 합의가 있을 때 도입한다.

| 영역 | 기술 |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| 상태관리 | Zustand (전역), TanStack Query (서버 상태) |
| 폼/검증 | React Hook Form, Zod |
| 스타일 | Tailwind CSS, shadcn/ui |
| 아이콘 | Lucide React |
| 애니메이션 | React Bits (제한적 사용) |
| 화상면접 | LiveKit React SDK (WebRTC) |
| 라우팅 | React Router |
| Backend | Spring Boot, MySQL(RDS) |
| AI 서버 | FastAPI |
| 인프라 | AWS (S3, RDS), Kubernetes(선택) |

## 코드 작성 시 항상 지킬 것

- 새 컴포넌트를 만들기 전에 먼저 기존 컴포넌트로 구현 가능한지 확인한다. 같은 기능의 컴포넌트를 중복 생성하지 않는다.
- 색상, 폰트 크기, 여백, radius, shadow, z-index는 **절대 임의 값을 하드코딩하지 않는다.** 아래 디자인 토큰 표와 `tailwind.config`에 정의된 클래스명만 사용한다. (`text-[28px]`, `z-[9999]`, `#1A2A4A` 직접 입력 등 금지)
- 버튼/입력창/카드 등 인터랙션 컴포넌트를 만들 때는 필요한 상태(Default/Hover/Focus/Active/Selected/Disabled/Loading/Error)를 빠짐없이 구현한다.
- 한 화면에 Primary 버튼은 1개만 배치한다.
- 에러 메시지는 원인과 해결 방법을 함께 작성한다. ("오류가 발생했습니다" 같은 문구 금지)
- AI 분석 결과 관련 텍스트는 단정적 표현을 쓰지 않는다. ("~좋지 않습니다" ❌ → "~한 시간이 길었어요" ✅)
- 삭제, 면접 종료 등 되돌릴 수 없는 행동에는 확인 Dialog를 반드시 넣는다.
- shadcn/ui 컴포넌트는 기본 스타일 그대로 쓰지 않고 아래 Ait 토큰으로 오버라이드한다.

## 디자인 토큰

### 컬러 (작성 예정인 `globals.css`에 정의한 뒤 값 직접 입력 대신 CSS 변수/Tailwind 클래스로 참조)

```css
:root {
  --background: #F8FAFC;
  --foreground: #0F172A;
  --primary: #1A2A4A;
  --primary-foreground: #FFFFFF;
  --secondary: #64748B;
  --accent: #C9A96E; /* 성취(합격·우수·완료) 전용. 일반 버튼/강조에 쓰지 않는다 */
  --accent-foreground: #1A2A4A;
  --muted: #F1F5F9;
  --card: #FFFFFF;
  --border: #E2E8F0;
  --input: #E2E8F0;
  --ring: #1A2A4A;
  --destructive: #C0392B;
  --radius: 12px;
}
```

- **Status Color(Success/Warning/Error/Info/Neutral)**는 Text·Surface·Border 3단계를 항상 함께 사용한다. 배경색 단독으로 상태를 표현하지 않는다. 정확한 hex 값은 그라운드룰 문서 4.3 참고.
- 골드(`--accent`)는 합격·우수·완료 등 성취 맥락에서만 사용한다.
- 흰 배경 위 골드 텍스트는 대비 미달(2.3:1)이므로 본문에 사용하지 않는다.

### 타이포그래피

| 클래스 | 크기·굵기 | 용도 |
| --- | --- | --- |
| `text-display` | 40·700 | 랜딩 히어로 |
| `text-h1` | 32·700 | 페이지 제목 |
| `text-h2` | 24·700 | 섹션 제목 |
| `text-h3` | 20·600 | 카드 제목 |
| `text-body` | 16·400 | 본문 |
| `text-body-sm` | 14·400 | 보조 설명 |
| `text-caption` | 12·400 | 날짜 등 부가 정보만. 판단이 필요한 설명 문구엔 쓰지 않는다 |

폰트는 Pretendard 고정.

### Spacing (8px 그리드, 4px 최소 단위 예외)

`space-1`(4) · `space-2`(8) · `space-3`(12) · `space-4`(16) · `space-6`(24) · `space-8`(32) · `space-12`(48)

### Radius

S 8px(Badge/입력창/버튼) · M 12px(카드) · L 16px(모달) · Pill 999px(아바타)

### Elevation

`elevation-1`(카드) · `elevation-2`(hover/popover) · `elevation-3`(모달) — 이 3단계 외 그림자 추가 금지.

### z-index

Base 0 · Sticky 100 · Dropdown 200 · Overlay 300 · Dialog 400 · Toast 500

### Motion

`duration-fast` 150ms(hover) · `duration-base` 250ms(모달/드롭다운) · `duration-slow` 400ms(페이지 전환)
easing은 `cubic-bezier(0.4, 0, 0.2, 1)`(기본) / `cubic-bezier(0.2, 0, 0, 1)`(강조) 사용.

### Focus Ring

모든 인터랙티브 요소: 3px, Navy 25% 투명도.

## Component 상태별 정확한 값 (Figma 코드 추출본 기준)

버튼/입력창 등의 hover, active, disabled 스타일을 임의로 만들지 말고 아래 값을 그대로 쓴다.

**Button — Primary**

| 상태 | 값 |
| --- | --- |
| Default | `background: #1A2A4A; color: #fff;` |
| Hover | `background: #223A63;` |
| Active | `background: #14203A;` |
| Disabled | `background: #CBD5E1; color: #94A3B8;` |

**Button — Accent (Gold)**

| 상태 | 값 |
| --- | --- |
| Default | `background: #C9A96E; color: #1A2A4A;` |
| Hover | `background: #BE9A5A;` |
| Active | `background: #A8894E;` |
| Disabled | `background: #F8F3E8; color: #C4B393;` |

공통: `padding: 10px 16px; border-radius: 8px; font-size: 14px; font-weight: 600;`

**Badge — 성취(준비 완료/우수/합격 등)**

`background: #F8F3E8; color: #8A6E38; border: 1px solid #E4D2AE; border-radius: 999px; padding: 5px 12px;`

> 주의: 성취 배지 텍스트는 `--accent`(#C9A96E)를 그대로 쓰지 않는다. 대비 확보를 위해 더 어두운 톤(`#8A6E38`)을 쓴다. `--accent`는 버튼/큰 면적 배경용이고, 텍스트로 쓸 때는 `#8A6E38`을 쓴다.

**Badge — Secondary**

`background: #E2E8F0; color: #475569; border-radius: 999px; padding: 5px 12px;`

**Input**

| 상태 | 값 |
| --- | --- |
| Default | `border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 8px;` |
| Focused | `border: 2px solid #1A2A4A; box-shadow: 0 0 0 3px rgba(26,42,74,0.10);` |
| Error | `border: 1px solid #C0392B;` + 하단에 `color: #C0392B` 안내 문구 |
| Disabled | `background: #F1F5F9; color: #94A3B8;` |

**Focus Ring (인터랙티브 요소 공통, 버튼 기준)**

`box-shadow: 0 0 0 3px rgba(26,42,74,0.25);` (입력창은 0.10 투명도로 더 옅게 사용)

**Toggle/Switch (Off 상태)**

`background: #CBD5E1;` (44×24px, thumb 20×20px 흰색)

**Elevation — 실제 box-shadow 값**

| 토큰 | 값 |
| --- | --- |
| elevation-1 | `0 1px 2px rgba(15,23,42,0.05)` |
| elevation-2 | `0 4px 12px rgba(15,23,42,0.10)` |
| elevation-3 | `0 12px 32px rgba(15,23,42,0.16~0.20)` |

**Skeleton Shimmer**

`linear-gradient(90deg, #EEF2F6 25%, #E2E8F0 37%, #EEF2F6 63%)` + `background-size: 400% 100%` + 1.4s 무한 애니메이션

## shadcn/ui 컴포넌트 도입 기준

- **Adopt(거의 그대로)**: Separator, Skeleton, Progress, Avatar, Scroll Area, Collapsible
- **Override(토큰 적용 필수)**: Button, Input, Select, Dialog, Card, Table, Badge, Tabs, Checkbox, Switch, Tooltip, Menubar, Context Menu, Carousel, Resizable, Aspect Ratio, Label, Popover, Calendar, Command, Sheet, Sonner, Accordion, Input OTP
- 위 목록에 없는 컴포넌트는 임의로 새로 도입하지 말고 먼저 팀에 확인한다.

## React Bits 사용 규칙

성취·피드백 화면에만, Motion 토큰 범위 내에서 제한적으로 사용한다.

- 허용: Count Up(점수/퍼센트), Fade/Slide-in(카드·모달 진입), Animated Number(리포트 점수)
- 금지: Aurora/Gradient BG, Particles/Star Border, Shiny/Gradient Text, Spotlight/Tilt Card
- React Bits는 `prefers-reduced-motion`을 자동 반영하지 않으므로 공통 래퍼에서 반드시 분기 처리한다.
- 화상 면접 진행 화면에는 장식 애니메이션(배경 파티클 등)을 사용하지 않는다.

## UX Writing 톤

- 버튼: 간결한 동사형 ("면접 시작", "지원 정보 저장하기")
- 에러: 원인+해결책을 정중하게 ("지원 직무를 입력해 주세요.")
- 안내: 차분하고 신뢰감 있게 ("환경 점검이 완료되었습니다.")
- 사용자를 비난하거나 불안하게 만드는 표현 금지.

## 아이트래킹 데이터 처리 원칙 (프론트 구현 시 유의)

- 원본 gaze 좌표(0.1초 간격)는 서버로 실시간 전송하지 않는다. Zustand 메모리 버퍼에만 임시 보관한다.
- 질문 단위 종료 시점에 요약 통계(`avgGazeDeviation`, `maxDeviationDuration`, `varianceScore`, `abnormalEventCount`)만 계산해 전송한다.
- 전송 스키마는 Zod로 검증 후 전송한다.

## 파일/폴더 구조

> TODO: 실제 레포 구조 확정되면 채우기. 예: `src/components/ui`(shadcn), `src/components/interview`(도메인 컴포넌트), `src/stores`(Zustand), `src/hooks`, `src/lib` 등.

## 브랜치/커밋 컨벤션

- 브랜치: `feat/기능명` 형식
- 린터: ESLint (Oxlint 대신 채택)

> TODO: 커밋 메시지 컨벤션, PR 템플릿 등 확정되면 추가.

## 참고 문서

- 상세 디자인 규칙 전체: `docs/Ait_UX_UI_그라운드룰_v2.md` (작성 예정, 본 파일은 그 요약/실행 버전)
- Figma 디자인 시스템: (링크 추가 예정)

## Claude에게: 모를 때는

- 그라운드룰 문서에 없는 값이 필요하면 임의로 만들지 말고, 가장 가까운 기존 토큰을 쓰거나 사용자에게 확인을 요청한다.
- 디자인 토큰과 실제 Figma 값이 다르게 보이면 Figma를 우선하고 사용자에게 알린다.
