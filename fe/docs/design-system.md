# Ait Design System

이 문서는 Ait 프론트엔드 UI의 시각 토큰, 컴포넌트 상태, 반응형과 접근성 기준이다. 토큰은 향후 `globals.css`와 Tailwind 설정에 구현하며, 구현 전에는 존재하는 것처럼 가정하지 않는다.

최신 Figma와 이 문서가 다르면 Figma를 우선하고 문서를 함께 갱신한다.

## 1. 디자인 원칙

핵심 키워드는 `Professional · Trustworthy · Focused`다.

- 면접과 질문에 집중할 수 있는 차분한 화면을 만든다.
- 장식보다 정보의 위계와 다음 행동을 명확하게 보여준다.
- 색상, 간격, 형태와 모션은 공통 토큰으로 일관되게 표현한다.
- 접근성과 반응형을 별도 보완 작업이 아닌 기본 디자인 조건으로 취급한다.

## 2. 레이아웃과 반응형

- 기본 콘텐츠 최대 너비는 `1000px`, 중앙 정렬을 기준으로 한다.
- 8px Grid System을 사용하며 `4px`는 최소 단위 예외로만 허용한다.
- 권장 간격: 페이지 좌우 `32px`, 섹션 `48px`, 카드 간·내부 `24px`, 입력 요소 `16px`, 아이콘과 텍스트 `8px`.
- 기본 Mobile, `md` Tablet, `lg` Desktop 순서로 설계한다.
- 근거 없이 별도의 커스텀 미디어 쿼리를 추가하지 않는다.
- 화면이 좁아져도 질문, 진행 상태와 핵심 CTA가 사라지지 않게 한다.

## 3. 색상

다음 값은 `globals.css`에 구현할 목표 토큰이다. 컴포넌트에서 hex 값을 직접 사용하지 않는다.

```css
:root {
  --background: #f8fafc;
  --foreground: #0f172a;
  --primary: #1a2a4a;
  --primary-foreground: #ffffff;
  --secondary: #64748b;
  --accent: #c9a96e;
  --accent-foreground: #1a2a4a;
  --muted: #f1f5f9;
  --card: #ffffff;
  --border: #e2e8f0;
  --input: #e2e8f0;
  --ring: #1a2a4a;
  --destructive: #c0392b;
}
```

- Primary Navy는 핵심 행동과 선택 상태에 사용한다.
- Accent Gold는 합격·우수·완료 등 성취 맥락에만 사용한다.
- 흰 배경 위에 Gold를 본문 텍스트 색상으로 사용하지 않는다.
- Success, Warning, Error, Info, Neutral은 Text/Icon + Surface + Border 조합으로 표현한다.
- 상태 색상의 세부 값은 최신 Figma에서 확정하기 전 임의로 추가하지 않는다.
- 색상만으로 상태를 전달하지 않고 문구 또는 아이콘을 함께 제공한다.

## 4. 타이포그래피

기본 폰트는 Pretendard다.

| 토큰 | 크기·굵기 | 용도 |
| --- | --- | --- |
| `text-display` | 40px·700 | 랜딩 히어로 |
| `text-h1` | 32px·700 | 페이지 제목 |
| `text-h2` | 24px·700 | 섹션 제목 |
| `text-h3` | 20px·600 | 카드 제목 |
| `text-body` | 16px·400 | 본문 |
| `text-body-sm` | 14px·400 | 보조 설명 |
| `text-caption` | 12px·400 | 날짜·개수·파일 크기 등 부가 정보 |

- 판단이나 행동에 필요한 설명을 `text-caption`으로 작게 처리하지 않는다.
- `text-[28px]`과 같은 임의 크기를 추가하지 않는다.

## 5. 간격과 형태

### Spacing

`space-1`(4) · `space-2`(8) · `space-3`(12) · `space-4`(16) · `space-6`(24) · `space-8`(32) · `space-12`(48)

### Radius

- S 8px: Badge, Input, Button
- M 12px: Card
- L 16px: Dialog
- Pill 999px: Avatar와 Pill 형태 Badge

### Elevation

명칭은 다음 세 단계로만 사용한다.

| 토큰 | 용도 | 값 |
| --- | --- | --- |
| `elevation-1` | Card | `0 1px 2px rgba(15, 23, 42, 0.05)` |
| `elevation-2` | Hover, Popover | `0 4px 12px rgba(15, 23, 42, 0.10)` |
| `elevation-3` | Dialog | 최신 Figma에서 최종값 확인 필요 |

임의의 box-shadow나 별도 elevation 이름을 추가하지 않는다.

### z-index

Base 0 · Sticky 100 · Dropdown 200 · Overlay 300 · Dialog 400 · Toast 500

`z-[9999]`와 같은 임의 값을 추가하지 않는다.

## 6. 모션

- `duration-fast` 150ms: Hover
- `duration-base` 250ms: Dialog, Dropdown과 일반 진입
- `duration-slow` 400ms: 페이지 전환
- 기본 easing: `cubic-bezier(0.4, 0, 0.2, 1)`
- 강조 easing: `cubic-bezier(0.2, 0, 0, 1)`
- 모든 모션은 `prefers-reduced-motion`을 반영한다.
- 면접 진행 화면에는 반복 장식 애니메이션을 사용하지 않는다.

## 7. Focus

- 일반 인터랙티브 요소: `0 0 0 3px rgba(26, 42, 74, 0.25)`
- Input Focus: `0 0 0 3px rgba(26, 42, 74, 0.10)`
- `outline: none`을 사용할 때는 동등하거나 더 명확한 `focus-visible` 스타일을 제공한다.

## 8. 컴포넌트 상태

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

| Variant | 용도 |
| --- | --- |
| Primary | 핵심 행동 |
| Secondary | 보조 행동 |
| Accent | 성취와 연결된 행동 |
| Text | 부가 행동 |
| Destructive | 삭제와 종료 |

### Primary

| 상태 | 값 |
| --- | --- |
| Default | `background: #1a2a4a; color: #ffffff` |
| Hover | `background: #223a63` |
| Active | `background: #14203a` |
| Disabled | `background: #cbd5e1; color: #94a3b8` |

### Accent

| 상태 | 값 |
| --- | --- |
| Default | `background: #c9a96e; color: #1a2a4a` |
| Hover | `background: #be9a5a` |
| Active | `background: #a8894e` |
| Disabled | `background: #f8f3e8; color: #c4b393` |

공통 크기: `padding: 10px 16px; border-radius: 8px; font-size: 14px; font-weight: 600`

버튼 문구는 `확인`, `다음`보다 `면접 시작`, `환경 점검으로 이동`처럼 행동을 설명하는 동사형으로 작성한다.

## 10. Badge

### 성취 Badge

```css
background: #f8f3e8;
color: #8a6e38;
border: 1px solid #e4d2ae;
border-radius: 999px;
padding: 5px 12px;
```

Gold 배경 위 텍스트는 대비 확보를 위해 `#8a6e38`을 사용한다.

### Secondary Badge

```css
background: #e2e8f0;
color: #475569;
border-radius: 999px;
padding: 5px 12px;
```

## 11. Input

모든 입력 요소에는 화면에 보이는 Label을 제공한다.

| 상태 | 값 |
| --- | --- |
| Default | `border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px` |
| Focus | `border: 2px solid #1a2a4a` + Input Focus ring |
| Error | `border: 1px solid #c0392b` + 가까운 위치의 오류 문구 |
| Disabled | `background: #f1f5f9; color: #94a3b8` |

- Placeholder를 Label 대신 사용하지 않는다.
- 오류 문구에는 원인과 해결 방법을 함께 표시한다.
- 검증 실패 후에도 사용자가 입력한 값은 유지된 화면을 디자인한다.

## 12. 기타 컴포넌트

- Switch Off: 44×24px, `background: #cbd5e1`, 흰색 20×20px thumb
- Skeleton: `#eef2f6`과 `#e2e8f0` 기반 Shimmer, 1.4초
- 아이콘: Lucide React 우선, 기본 24×24, `strokeWidth={2}`, `currentColor`
- 같은 의미에는 모든 화면에서 같은 아이콘을 사용한다.

## 13. shadcn/ui 도입 기준

shadcn/ui가 실제로 설치된 뒤 다음 범위를 기준으로 사용한다.

- Adopt: Separator, Skeleton, Progress, Avatar, Scroll Area, Collapsible
- Override: Button, Input, Select, Dialog, Card, Table, Badge, Tabs, Checkbox, Switch, Tooltip, Menubar, Context Menu, Carousel, Resizable, Aspect Ratio, Label, Popover, Calendar, Command, Sheet, Sonner, Accordion, Input OTP

목록에 없는 컴포넌트는 필요성을 확인한 뒤 도입한다.

## 14. React Bits

React Bits가 실제로 설치된 뒤 성취·피드백 화면에만 제한적으로 사용한다.

- 허용: Count Up, Animated Number, Card·Dialog Fade/Slide-in
- 금지: Aurora, Gradient Background, Particles, Star Border, Shiny Text, Spotlight, Tilt Card
- 공통 래퍼에서 `prefers-reduced-motion`을 처리한다.

## 15. 로고와 이미지

- 로고는 `public/Logo_Assets/README.md`를 따른다.
- 로고 비율과 색상을 임의로 변경하지 않는다.
- 로고 최소 크기는 24px, 최소 여백은 마크 높이의 50%다.
- 의미 있는 이미지에는 목적에 맞는 대체 텍스트를 제공한다.
- 장식 이미지는 빈 `alt` 등을 사용해 보조기술에서 제외한다.

## 16. 접근성 확인

- 본문 텍스트 대비는 WCAG AA 기준인 `4.5:1` 이상이어야 한다.
- 색상만으로 선택, 성공, 경고와 오류 상태를 전달하지 않는다.
- 아이콘 버튼에는 접근 가능한 이름과 필요한 경우 Tooltip을 제공한다.
- Dialog는 Focus trap과 닫힌 뒤 Focus 복귀를 지원해야 한다.
- 키보드만으로 주요 화면 흐름을 확인할 수 있어야 한다.
- 200% 확대와 좁은 화면에서도 콘텐츠와 주요 행동이 잘리지 않아야 한다.
