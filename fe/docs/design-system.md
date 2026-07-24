# Ait Design System

이 문서는 Ait 프론트엔드 UI의 시각 토큰, 컴포넌트 상태, 반응형과 접근성 기준이다. 승인된 시각 기준은 [design_guide.png](./design_guide.png)이며, 이 문서는 해당 가이드를 구현 가능한 규칙으로 옮긴 것이다.

토큰은 향후 `globals.css`와 Tailwind 설정에 구현한다. 실제 설정에 없는 토큰이나 라이브러리를 이미 사용할 수 있다고 가정하지 않는다. 최신 Figma 또는 승인된 디자인 가이드와 이 문서가 다르면 최신 시각 기준을 우선하고 문서를 함께 갱신한다.

## 1. 디자인 원칙

핵심 키워드는 `Professional · Trustworthy · Focused`다.

- 면접과 질문에 집중할 수 있는 차분한 화면을 만든다.
- 장식보다 정보의 위계와 다음 행동을 명확하게 보여준다.
- 색상, 간격, 형태와 모션은 공통 토큰으로 일관되게 표현한다.
- 접근성과 반응형을 별도 보완 작업이 아닌 기본 디자인 조건으로 취급한다.

## 2. 레이아웃과 그리드

- 기본 콘텐츠 최대 너비는 `1000px`, 중앙 정렬을 기준으로 한다.
- 8px Grid System을 사용하며 `4px`는 최소 단위 예외로만 허용한다.
- 권장 간격은 페이지 좌우 `32px`, 주요 섹션 `40px`, 카드 간·내부 `24px`, 입력 요소 `16px`, 아이콘과 텍스트 `8px`다.
- 강조용 Gold line을 사용하는 경우 길이는 `40px`로 통일하고 성취 맥락에만 배치한다.
- 기본 Mobile, `md` Tablet, `lg` Desktop 순서로 설계하며 근거 없이 커스텀 미디어 쿼리를 추가하지 않는다.
- 좁은 화면에서도 질문, 진행 상태와 핵심 CTA가 사라지지 않아야 한다.

## 3. 색상 토큰

### 3.1 기본 팔레트

| 역할 | Raw value | Semantic token | 용도 |
| --- | --- | --- | --- |
| Primary Navy | `#1A2A4A` | `color/action/primary` | 주요 버튼, 제목, 선택 상태 |
| Secondary Slate | `#64748B` | `color/text/secondary` | 설명, 보조 정보, 비활성 상태 |
| Accent Gold | `#C9A96E` | `color/status/achievement` | 합격, 우수, 완료 등 성취 |
| Gold Surface | `#F8F3E8` | `color/status/achievement-surface` | Gold Badge와 성취 강조 배경 |
| Background | `#F8FAFC` | `color/background/default` | 페이지 배경 |
| Surface | `#FFFFFF` | `color/surface/default` | Card, Dialog, Input 배경 |
| Border | `#E2E8F0` | `color/border/default` | Card와 입력창 구분선 |
| Text | `#0F172A` | `color/text/primary` | 본문과 제목 |

구현 목표 매핑은 다음과 같다.

```css
:root {
  --background: #f8fafc;
  --foreground: #0f172a;
  --primary: #1a2a4a;
  --primary-foreground: #ffffff;
  --secondary: #64748b;
  --accent: #c9a96e;
  --accent-foreground: #1a2a4a;
  --achievement-surface: #f8f3e8;
  --muted: #f1f5f9;
  --card: #ffffff;
  --border: #e2e8f0;
  --input: #e2e8f0;
  --ring: #1a2a4a;
  --destructive: #c0392b;
  --success: #2f7d57;
  --success-surface: #e7f3ec;
  --success-border: #bee0cc;
  --warning: #b45309;
  --warning-surface: #fbefdd;
  --warning-border: #ebd4ae;
  --error-surface: #fdecec;
  --error-border: #f3c6c6;
  --info: #2e4a72;
  --info-surface: #eef3fa;
  --info-border: #cbd9ec;
  --radius: 12px;
}
```

- Navy는 주요 버튼, 제목과 선택 상태에 사용한다.
- Slate는 설명, 보조 정보와 비활성 상태에 사용한다.
- Gold는 합격·우수·완료 등 성취 요소에만 사용하며 일반 버튼, 장식, 강조 전반에 남용하지 않는다.
- 흰 배경 위에 Gold를 본문 텍스트 색상으로 사용하지 않는다.
- 컴포넌트에서 raw hex를 직접 사용하지 않고 semantic token으로 매핑한다.

### 3.2 상태 색상

상태는 `Text/Icon · Surface · Border` 3단계로 표현한다.

| 상태 | Text / Icon | Surface | Border |
| --- | --- | --- | --- |
| Success | `#2F7D57` | `#E7F3EC` | `#BEE0CC` |
| Warning | `#B45309` | `#FBEFDD` | `#EBD4AE` |
| Error | `#C0392B` | `#FDECEC` | `#F3C6C6` |
| Info | `#2E4A72` | `#EEF3FA` | `#CBD9EC` |
| Neutral | `#64748B` | `#F1F5F9` | `#E2E8F0` |

- 색상만으로 상태를 전달하지 않고 문구 또는 의미가 같은 아이콘을 함께 제공한다.
- Badge, Alert, Toast와 입력 오류는 같은 상태 토큰을 공유한다.
- Error와 파괴적 행동에는 동일한 `#C0392B` 계열을 사용하되, 오류 안내와 삭제 행동은 문구로 구분한다.

### 3.3 확인된 대비

| 조합 | 대비 | 기준 |
| --- | --- | --- |
| Text / Navy | `13.8:1` | AAA |
| Navy / Gold | `6.1:1` | AA |
| Slate / White | `4.8:1` | AA |
| Gold / White | `2.3:1` | 본문 텍스트 사용 금지 |

### 3.4 질문 생성 대기 화면 색상

AI 질문 생성 대기 화면에서만 사용하는 파스텔 팔레트다(`design_handoff_ait_loading_b` B안 기준). 텍스트·카드·상태 표현은 일반 시맨틱 토큰(Text, Surface, Border, Success, Info)을 그대로 쓰고, 아래 토큰은 이 화면의 장식과 보조 요소에만 사용한다.

| 역할 | HEX | 토큰 |
| --- | --- | --- |
| 링 파스텔 블루 | `#DCE6F5` | `color/loading/pastel-blue` |
| 링 파스텔 바이올렛 | `#EAE3F2` | `color/loading/pastel-violet` |
| 링 파스텔 그린 | `#DDEBE4` | `color/loading/pastel-green` |
| 배경 그라데이션 블루 | `#F3F6FB` | `color/loading/background-blue` |
| 배경 그라데이션 바이올렛 | `#F5F3F8` | `color/loading/background-violet` |
| 조건 칩 보조 텍스트 | `#475569` | `color/loading/chip-text` |
| 팁 카운터 뱃지 표면 | `#EEF2F8` | `color/loading/counter-surface` |
| 진행바 트랙 | `#E9EDF3` | `color/loading/progress-track` |
| 진행바 그라데이션 끝 | `#5A7BA6` | `color/loading/progress-tint` |

- 파스텔 색은 장식(링, 배경 그라데이션, 진행바)에만 사용하고 텍스트 색상으로 쓰지 않는다. 텍스트는 `chip-text`(`#475569`)보다 밝은 색을 쓰지 않는다.
- 이 화면에 다크 배경, 네온, 골드(`#C9A96E`)를 사용하지 않는다.
- 진행바는 비확정(indeterminate)으로만 표현하고 `%`, "약 n초" 같은 확정 수치를 표시하지 않는다.

### 3.5 면접 세션 시어터 화면 색상

면접 진행 화면(`/interviews/session`)에서만 사용하는 다크 오버레이 팔레트다(`design_handoff_ait_session_theater` 기준). 면접관 영상을 전면 배경으로 깔기 때문에 이 화면의 텍스트와 컨트롤은 흰색 계열을 쓰고, 가독성은 그라데이션 스크림으로 확보한다.

| 역할 | 값 | 토큰 |
| --- | --- | --- |
| 영상 배경 | `#0F172A` | `color/theater/backdrop` |
| 라이브 점·녹음 중 버튼 | `#E74C3C` | `color/theater/live` |
| 기본 텍스트 | `#FFFFFF` | 고정값 |
| 보조 텍스트 | `rgba(255,255,255,.75)` / `.65` / `.6` | 고정값 |
| 글래스 카드 배경 | `rgba(15,23,42,.5)` + blur 14px | 고정값 |
| 글래스 카드 테두리 | `rgba(255,255,255,.16)` | 고정값 |
| 상태 배지 배경 | `rgba(255,255,255,.14)` + blur 6px | 고정값 |
| 고스트 버튼 테두리 | `rgba(255,255,255,.35)` | 고정값 |

- 스크림은 `linear-gradient(180deg, rgba(15,23,42,.55) 0%, transparent 22%, transparent 48%, rgba(15,23,42,.78) 100%)` 고정값이며 포인터 이벤트를 받지 않는다.
- 주 버튼(답변 녹음)은 흰색 배경 + Navy(`#1A2A4A`) 텍스트, 녹음 중에는 `color/theater/live` 배경 + 흰색 텍스트로 토글한다.
- 이 팔레트는 시어터 화면 밖(라이트 배경)에서 사용하지 않는다.

## 4. 타이포그래피

기본 폰트는 Pretendard다.

| 토큰 | 크기 / 굵기 | 용도 |
| --- | --- | --- |
| `text-display` | 40px / 700 | 랜딩 히어로와 한정된 대형 메시지 |
| `text-h1` | 32px / 700 | 페이지 제목 |
| `text-h2` | 24px / 700 | 섹션 제목 |
| `text-h3` | 20px / 600 | 카드 제목 |
| `text-body-1` | 16px / 400 | 본문 |
| `text-body-2` | 14px / 400 | 보조 설명 |
| `text-caption` | 12px / 400 | 날짜, 개수, 파일 크기 등 부가 정보 |

- Text primary는 제목과 본문, Text secondary는 설명과 보조 정보에 사용한다.
- 판단이나 행동에 필요한 설명을 `text-caption`으로 작게 처리하지 않는다.
- `text-[28px]`과 같은 임의 크기를 추가하지 않는다.

## 5. 간격, 형태와 레이어

### Spacing

`space-1`(4) · `space-2`(8) · `space-3`(12) · `space-4`(16) · `space-6`(24) · `space-8`(32) · `space-10`(40)

### Radius

- S `8px`: Badge, Input, Button
- M `12px`: Card와 shadcn 기본 `--radius`
- L `16px`: Dialog
- Pill `999px`: Avatar와 Pill Badge

### Elevation

| 토큰 | 시각 단계 | 용도 |
| --- | --- | --- |
| `elevation-1` | Subtle | 기본 Card |
| `elevation-2` | Medium | Hover와 Popover |
| `elevation-3` | Large | Dialog와 Floating UI |

가이드에 수치가 명시되지 않은 그림자 값은 임의로 만들지 않는다. 임의의 `box-shadow`나 별도 elevation 이름도 추가하지 않는다.

### z-index

Base 0 · Sticky 100 · Dropdown 200 · Overlay 300 · Dialog 400 · Toast 500

`z-[9999]`와 같은 임의 값을 추가하지 않는다.

## 6. 모션

- `duration-fast` 150ms: Hover
- `duration-base` 250ms: Dialog, Dropdown, Card 진입
- `duration-slow` 400ms: 페이지 전환
- `easing-standard`: `cubic-bezier(0.4, 0, 0.2, 1)`
- `easing-emphasized`: `cubic-bezier(0.2, 0, 0, 1)`
- 모든 모션은 `prefers-reduced-motion`을 반영한다.
- 면접 진행 화면에는 반복 장식 애니메이션을 사용하지 않는다.

## 7. Focus

- 모든 인터랙티브 요소에 `3px` Navy `25%` ring을 적용한다.
- Input도 동일한 Focus 원칙을 따르며 Focus 상태에서 테두리를 Navy로 강조한다.
- `outline: none`을 사용할 때는 동등하거나 더 명확한 `focus-visible` 스타일을 제공한다.

## 8. 공통 컴포넌트 상태

해당하는 인터랙티브 컴포넌트에는 다음 상태를 디자인한다.

`Default · Hover · Focus · Active · Selected · Disabled · Loading · Error`

- 데이터 로딩: Skeleton
- 저장 완료 등 짧은 결과: Toast
- 지속적으로 확인해야 하는 안내와 오류: Alert
- 데이터 없음: Empty State + 다음 행동 CTA
- 삭제와 면접 종료: 확인 Dialog
- Loading 중에는 중복 클릭이 발생하지 않는 Disabled 상태를 함께 표시한다.

## 9. Button

한 화면 또는 한 명확한 작업 영역에는 Primary 버튼을 하나만 둔다.

| Variant | 용도 | 상태 표현 |
| --- | --- | --- |
| Primary | 핵심 행동 | Navy fill, White text |
| Secondary | 보조 행동 | White fill, Navy border와 text |
| Accent | 성취와 연결된 행동 | Gold fill, Navy text |
| Text | 부가 행동 | 투명 배경, Navy text |
| Destructive | 삭제와 종료 | Error token |

모든 Variant는 Default, Hover, Active와 Disabled를 제공한다. Hover와 Active는 같은 계열 안에서 명도만 조정하며, 가이드에 없는 새 raw hex를 만들지 않는다. Disabled는 Slate와 Neutral 토큰을 사용하고 클릭할 수 없음이 문구와 형태에서도 드러나야 한다.

공통 크기는 `padding: 10px 16px; border-radius: 8px; font-size: 14px; font-weight: 600`이다.

버튼 문구는 `확인`, `다음`보다 `면접 시작`, `결과 저장`, `환경 점검으로 이동`처럼 행동을 설명하는 동사형으로 작성한다.

## 10. Badge

기본 상태 Variant는 `Primary · Secondary · Success · Warning · Error · Neutral`이다. 상태 Badge는 상태 색상 3단계 토큰을 사용한다.

성취 Badge는 다음 값을 사용한다.

```css
background: #f8f3e8;
color: #8a6e38;
border: 1px solid #e4d2ae;
border-radius: 999px;
padding: 5px 12px;
```

- 성취 문구 예: `준비 완료`, `우수`, `합격`
- Gold 배경 위 텍스트는 대비 확보를 위해 `#8A6E38`을 사용한다.
- `합격` Badge의 도메인 사용 조건은 `domain-rules.md`를 따른다.

Secondary Badge는 Neutral 계열을 사용한다.

```css
background: #e2e8f0;
color: #475569;
border-radius: 999px;
padding: 5px 12px;
```

## 11. Form Controls

모든 입력 요소에는 화면에 보이는 Label을 제공한다.

### Input

| 상태 | 값 |
| --- | --- |
| Default | `border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 8px` |
| Filled | 입력값과 Label을 함께 유지 |
| Focus | Navy border + `3px` Navy `25%` ring |
| Error | Error border + 입력창 가까이 오류 문구 |
| Disabled | Neutral surface + Slate text |

- Placeholder를 Label 대신 사용하지 않는다.
- 오류 문구에는 원인과 해결 방법을 함께 표시한다.
- 검증 실패 후에도 사용자가 입력한 값은 유지한다.

### Select, Checkbox, Radio와 Toggle

- Select는 Label, 현재 값, 펼침 상태와 Disabled 상태를 제공한다.
- Checkbox와 Radio의 선택 표시는 Navy를 사용하고 Label 전체를 클릭할 수 있게 한다.
- Toggle의 기본 크기는 `44×24px`, thumb은 흰색 `20×20px`다.
- Toggle Off는 Neutral, On은 Navy를 사용한다.

## 12. 탐색과 피드백 컴포넌트

### Tabs와 Segmented Control

- Tabs는 선택 항목을 Navy 텍스트와 하단 indicator로 표시한다.
- Segmented Control은 선택 항목에 Surface, 비선택 영역에 Neutral surface를 사용한다.
- 선택 상태를 색상만으로 표현하지 않고 형태와 텍스트 굵기를 함께 사용한다.

### Alert와 Toast

- Success, Warning, Error Alert는 상태별 Text/Icon, Surface와 Border 토큰을 함께 사용한다.
- 정보성 또는 저장 완료 Toast는 Navy surface를 사용할 수 있으며 메시지와 다음 행동을 함께 제공한다.
- Toast의 행동 예: `리포트 보기`
- 실제로 확인되지 않은 저장이나 완료 상태에는 완료 Toast를 표시하지 않는다.

### Dialog

- Overlay와 `elevation-3`를 사용하며 Radius L을 적용한다.
- 제목, 설명, Secondary 취소 행동과 Primary 확인 행동의 순서를 유지한다.
- 면접 시작·종료처럼 중요한 전환에는 무엇이 시작되거나 끝나는지 설명한다.
- Focus trap, Escape 닫기와 닫힌 뒤 Focus 복귀를 지원한다.

## 13. 도메인 조합 패턴

### Interview Card

- 면접 유형, 세부 유형, 날짜, 시간, 상태 Badge, 준비도와 핵심 행동을 한 Card 안에 배치한다.
- 준비도는 Progress와 수치를 함께 보여준다.
- Card 안의 Primary 행동은 `면접 시작` 하나로 제한한다.

### Feedback Report

- Radar Chart, 종합 점수, 종합 평가, 항목별 점수를 한 정보 영역으로 묶는다.
- 항목은 `논리력 · 표현력 · 순발력 · 태도 · 직무 전문성 · 자신감` 순서를 기준으로 한다.
- 최고 점수나 성취 결과에만 Gold를 제한적으로 사용한다.
- 차트만으로 값을 전달하지 않고 동일한 수치를 텍스트 또는 표로 제공한다.
- 점수와 평가 문구의 도메인 해석은 `domain-rules.md`를 따른다.

### Progress · Stepper

기본 단계는 `환경 점검 → 대기실 → 면접 진행 → 리포트`다.

- 완료 단계는 Check 아이콘, 현재 단계는 숫자와 Focus ring 형태, 예정 단계는 Neutral로 구분한다.
- 단계명과 현재 위치를 색상 외에도 아이콘과 형태로 전달한다.

### Empty State, Skeleton과 Table

- 예약 Empty State는 제목, 짧은 안내와 `면접 예약하기` CTA를 제공한다.
- Skeleton은 `#EEF2F6`과 `#E2E8F0` 기반 Shimmer를 사용하며 주기는 `1.4s`다.
- 면접 기록 Table은 `면접 유형 · 날짜 · 점수 · 결과` 열을 기준으로 한다.
- 좁은 화면에서 Table은 핵심 정보를 Card 목록으로 전환하거나 가로 스크롤과 열 제목 접근성을 보장한다.

## 14. shadcn/ui 도입 기준

shadcn/ui가 실제로 설치된 뒤 구조와 기능의 기반으로 사용하며, 기본 스타일을 그대로 쓰지 않고 Ait semantic token으로 오버라이드한다.

| shadcn 기준 | Ait 오버라이드 |
| --- | --- |
| Base color: Zinc / Neutral | `color/action/primary · #1A2A4A` |
| Accent 없음 | `color/status/achievement · #C9A96E` |
| `--radius: 0.5rem` | S 8 / M 12 / L 16 |
| `ring / ring-offset` | `3px` Navy `25%` |
| `shadow-sm / md` | `elevation-1 · elevation-2 · elevation-3` |
| Geist / Inter | Pretendard |
| `red-500` | Error `#C0392B` |

| 구분 | 컴포넌트 |
| --- | --- |
| Adopt | Separator, Skeleton, Progress, Avatar, Scroll Area, Collapsible, Label |
| Override | Button, Input, Select, Dialog, Card, Table, Badge, Tabs, Checkbox, Switch, Tooltip, Popover, Calendar, Command, Sheet, Sonner, Accordion, Input OTP |
| Skip | Menubar, Context Menu, Carousel, Resizable, Aspect Ratio |

도입 우선순위는 다음과 같다.

1. Date Picker
2. Command / Combobox
3. Tooltip / Popover
4. Data Table

그다음 필요에 따라 Sheet / Drawer, Accordion과 Input OTP를 검토한다. Skip 항목은 미사용이 기본이며 별도 요구와 근거가 있을 때만 재검토한다.

### 조합 Block

| 화면 단위 | 조합 |
| --- | --- |
| 면접 예약 폼 | Form + Date Picker + Select + Input + Button |
| 면접 기록 | Data Table + Pagination + Badge + Tabs |
| 피드백 리포트 | Card + Chart + Progress + Accordion |
| 설정 패널 | Sheet + Switch + Separator + Input |

## 15. React Bits

React Bits가 실제로 설치된 뒤 성취·피드백 화면에만 제한적으로 사용한다.

- 허용: Count Up(점수, 준비도 %, 통계), Animated Number(리포트 종합 점수), Card·Dialog Fade / Slide-in
- 금지: Aurora, Gradient Background, Particles, Star Border, Shiny / Gradient Text, Spotlight, Tilt Card
- 허용 모션도 `150–400ms` 범위와 공통 motion token을 사용한다.
- 공통 래퍼에서 `prefers-reduced-motion`을 처리한다.

## 16. 아이콘과 로고

- 아이콘은 Lucide React를 우선 사용하며 기본 `24×24`, `strokeWidth={2}`, 편집 가능한 SVG와 `currentColor`를 기준으로 한다.
- 같은 의미에는 모든 화면에서 같은 아이콘을 사용한다.
- 로고는 `public/Logo_Assets/README.md`를 따른다.
- 로고 최소 크기는 `24px`, 최소 여백은 마크 높이의 `50%`다.
- 로고 비율, 색상과 형태를 임의로 변경하지 않는다.
- 의미 있는 이미지에는 목적에 맞는 대체 텍스트를 제공하고 장식 이미지는 보조기술에서 제외한다.

## 17. 접근성 확인

- 본문 텍스트 대비는 WCAG AA 기준인 `4.5:1` 이상이어야 한다.
- 색상만으로 선택, 성공, 경고와 오류 상태를 전달하지 않는다.
- 아이콘 버튼에는 접근 가능한 이름과 필요한 경우 Tooltip을 제공한다.
- 모든 Form Control에 연결된 Label을 제공한다.
- Dialog는 Focus trap과 닫힌 뒤 Focus 복귀를 지원해야 한다.
- 키보드만으로 주요 화면 흐름을 확인할 수 있어야 한다.
- 200% 확대와 좁은 화면에서도 콘텐츠와 주요 행동이 잘리지 않아야 한다.
