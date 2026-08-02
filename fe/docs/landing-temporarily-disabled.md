# 랜딩 페이지 임시 비활성화 기록

> 2026-08-02 · 커밋 `ea8f8b0` (`chore: 랜딩 페이지 임시 비활성화 및 에셋 배포 제외`)

## 배경

랜딩 페이지 디자인·카피가 외부에 노출되지 않도록 배포 사이트에서 임시로 숨긴다.
소스 파일은 삭제·주석 처리하지 않았고, 아래 두 지점만 수정해 배포 산출물에서 제외했다.

## 변경 내용

### 1. 라우팅 — `src/app/route-guards.tsx`

- `HomeRoute`에서 비로그인 사용자에게 `<LandingPage />` 대신 `<Navigate to="/login" replace />`를 렌더링한다.
- `LandingPage` import를 제거했다. 렌더링만 막고 import를 남기면 랜딩 컴포넌트와 `landing.data.ts`의 카피 문구가 빌드 번들(JS)에 그대로 포함되어 개발자 도구로 읽을 수 있기 때문에, import 자체를 끊어 번들에서 제외했다.

### 2. 정적 에셋 — `public/Ait_landing_package` → `landing-assets-hidden`

- `public/` 안의 파일은 번들과 무관하게 URL만 알면 배포 사이트에서 그대로 내려받을 수 있다(스크린샷, `references/landing-ui-reference.png`, `references/design-system.png` 등).
- 폴더를 `fe/landing-assets-hidden/`으로 이동해 정적 배포에서 제외했다. 내부 구조는 그대로 유지했다.

## 영향 범위

- 비로그인 상태로 `/` 진입 시 로그인 페이지로 리다이렉트된다. 그 외 화면은 영향 없다.
- 로그인·회원가입 화면의 `LandingHeader`는 `Logo_Assets`와 라우트 상수(`landingRoutes`)만 참조하므로 정상 동작한다.
- `src/pages/LandingPage.tsx`와 `src/components/landing/**`은 어디서도 import되지 않는 상태로 남아 있다(빌드에는 포함되지 않음).

## 검증 내역

- `npm run build` 통과(타입 체크 포함)
- 빌드 산출물에서 랜딩 카피(`누적 사용자`, `실전형 질문` 등) 검색 → 없음 확인
- `dist/Ait_landing_package` 미존재 확인

## 복구 방법

1. `src/app/route-guards.tsx`에서 되살린다.

   ```tsx
   import { LandingPage } from '@/pages/LandingPage'

   // HomeRoute
   return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />
   ```

2. 에셋 폴더를 원위치로 옮긴다.

   ```bash
   git mv fe/landing-assets-hidden fe/public/Ait_landing_package
   ```

3. `npm run build` 후 `/` 진입 시 랜딩이 렌더링되고 이미지가 정상 로드되는지 확인한다.
