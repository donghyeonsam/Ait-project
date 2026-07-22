# Ait 인증 화면 에셋 팩

로그인·회원가입 페이지 예시안에 필요한 벡터 에셋입니다.

## 구성

- `brand/ait-logo.svg` — 헤더용 Ait 로고
- `brand/ait-mark.svg` — 파비콘·모바일 헤더용 심벌
- `illustrations/login-ai-interview.svg` — 로그인 페이지 AI 면접 일러스트
- `illustrations/signup-growth.svg` — 회원가입 페이지 성장 과정 일러스트
- `decorations/auth-wave.svg` — 좌측 패널 하단 웨이브
- `decorations/dot-grid.svg` — 배경 도트 패턴
- `icons/` — 폼, 상태, 기능 및 소셜 로그인 아이콘

## React 사용 예시

```tsx
import logoUrl from '@/assets/auth/brand/ait-logo.svg';
import loginVisualUrl from '@/assets/auth/illustrations/login-ai-interview.svg';

export function LoginVisual() {
  return <img src={loginVisualUrl} alt="AI 모의면접과 분석 리포트" />;
}
```

일반 아이콘은 `currentColor`를 사용하므로 인라인 SVG나 SVGR로 불러오면 CSS의 `color` 값으로 색상을 바꿀 수 있습니다. Google 아이콘은 공식 브랜드 색상이고 GitHub 아이콘은 `currentColor`입니다.

## 권장 크기

| 에셋 | 권장 표시 크기 |
|---|---:|
| Ait 로고 | 105×32 ~ 158×48px |
| 로그인 일러스트 | 최대 560×405px |
| 회원가입 일러스트 | 최대 640×376px |
| 폼 아이콘 | 20×20px |
| 도트 패턴 | 80×80 ~ 160×160px |

SVG의 `viewBox`가 설정되어 있어 비율을 유지한 채 자유롭게 확대할 수 있습니다.
