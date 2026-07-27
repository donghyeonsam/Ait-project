# Handoff: Ait 면접 세션 화면 — 몰입형 시어터 리디자인

아래 내용을 그대로 Claude Code 프롬프트로 사용하세요.

---

## Overview
Ait(AI 모의면접 서비스)의 면접 진행 화면(`/interviews/session`)을 리디자인한다. 기존 화면은 세로로 길어 스크롤이 필요했으나, 새 디자인은 **면접관 영상을 뷰포트 전면 배경으로 깔고 질문·컨트롤을 하단 오버레이 패널로 집약해 스크롤 없이 한 화면(100vh)에 모두 들어온다.** 글로벌 헤더와 푸터는 이 화면에서 제외하고, 면접 전용 슬림 헤더로 대체한다.

## About the Design Files
이 번들의 `session-theater.html`은 **HTML로 만든 디자인 레퍼런스(프로토타입)**이며 프로덕션 코드가 아니다. 목표는 이 디자인을 **대상 코드베이스(React + Vite, localhost:5173 기준)의 기존 패턴·컴포넌트·라이브러리로 재구현**하는 것이다. HTML을 그대로 복사하지 말 것.

## Fidelity
**High-fidelity.** 색상·타이포·간격·구성이 최종안이다. 코드베이스에 기존 디자인 토큰/컴포넌트가 있으면 매핑해 쓰되, 시각 결과는 레퍼런스와 픽셀 수준으로 일치시킬 것.

## Screen: 면접 세션 (몰입형 시어터)

레퍼런스는 1440×900 기준. 실제 구현은 `100vw × 100vh` 고정(스크롤 없음, `overflow:hidden`)이며 오버레이는 절대 배치이므로 자연스럽게 반응형이다.

### 레이어 구조 (아래→위)
1. **영상 레이어**: 면접관 영상(WebRTC/비디오 요소)이 화면 전체를 `object-fit:cover`로 채움. 배경색 `#0F172A`. 사용자 웹캠 PIP는 영상 내 좌하단(기존과 동일).
2. **그라데이션 스크림**: `linear-gradient(180deg, rgba(15,23,42,.55) 0%, transparent 22%, transparent 48%, rgba(15,23,42,.78) 100%)` — 상단 헤더와 하단 패널의 가독성 확보용. 포인터 이벤트 없음.
3. **헤더 (top: 0, height: 60px, padding: 0 32px)**
   - 좌측: 로고 "Ait" (22px / 800 / #FFFFFF, letter-spacing -0.02em) + 상태 배지.
   - 상태 배지: pill(radius 999px), 배경 `rgba(255,255,255,.14)` + `backdrop-filter: blur(6px)`, 텍스트 "면접 진행 중 · 질문 1/10" (13px / 600 / #FFF), 왼쪽에 7px 빨간 점(#E74C3C)이 1.6s로 깜빡임(opacity 1↔0.35). 질문 번호는 실제 진행 상태와 바인딩.
   - 우측: 고스트 버튼 2개 — "⟲ 질문 다시 듣기", "면접 종료". 스타일: padding 7px 14px, radius 999px, border `1px solid rgba(255,255,255,.35)`, 배경 투명, 텍스트 12.5px / 600 / #FFF.
4. **하단 오버레이 (bottom: 0, padding: 0 48px 36px, column gap 16px)**
   - **1행 (flex, align-items:flex-end, gap 24px)**
     - 질문 글래스 카드 (flex:1): 배경 `rgba(15,23,42,.5)`, border `1px solid rgba(255,255,255,.16)`, radius 18px, padding 22px 28px, `backdrop-filter: blur(14px)`. 내부: 라벨 "질문 N" (12px / 600 / rgba(255,255,255,.65), letter-spacing .08em, margin-bottom 10px) + 질문 본문 (19px / 600 / #FFF, line-height 1.6).
     - 녹음 버튼 컬럼 (flex:none, 세로 중앙 정렬, gap 9px): 주 버튼 "🎙 답변 녹음 시작" — 230×60px, radius 999px, 배경 #FFFFFF, 텍스트 16px / 700 / #1A2A4A, shadow `0 6px 20px rgba(0,0,0,.3)`. 아래 힌트 "Space 키로도 실행할 수 있어요" (12px / rgba(255,255,255,.75)).
   - **2행 (flex, space-between)**
     - 좌측: 마이크/스피커 볼륨 슬라이더 2개 (아이콘 + 120×4px 트랙, 트랙 `rgba(255,255,255,.25)`, 채움 #FFFFFF, radius 999px). 기존 화면의 슬라이더 기능 그대로 이관.
     - 우측: 개인정보 고지 한 줄 "🛡 녹음 파일은 음성 인식 처리에만 사용되고 저장되지 않습니다" (12px / rgba(255,255,255,.6)). 기존 화면의 상세 고지 문구는 이 한 줄 + (선택) 툴팁/모달로 축약.

### 기존 화면에서 제거/이동되는 것
- 글로벌 내비(대시보드/AI 모의면접/스터디 라운지/커뮤니티)와 푸터: 이 화면에서 렌더하지 않음 (면접 몰입 + 한 화면 목표).
- "질문 다시 듣기": 음성답변 카드 → 헤더 우측 고스트 버튼으로 이동.
- "음성 답변" 설명 카드: 하단 한 줄 고지로 축약. "답변을 녹음하면 텍스트로 변환되며 제출 전 수정 가능" 안내는 녹음 시작 후 상태에서 노출.

## Interactions & Behavior
- **녹음 시작**: 버튼 클릭 또는 Space 키. 녹음 중에는 버튼이 "녹음 중지"로 토글되고(배경 #E74C3C 또는 코드베이스의 danger 토큰, 텍스트 #FFF) 경과 타이머·파형 표시를 질문 카드 자리 또는 그 아래에 노출 — 기존 화면의 녹음 후 플로우(STT 텍스트 편집 → 제출)는 기능 그대로 유지.
- **질문 다시 듣기**: 기존 TTS 재생 로직 그대로 연결.
- **면접 종료**: 확인 모달 후 세션 종료(기존 플로우).
- **빨간 점 애니메이션**: `@keyframes` opacity 1 → .35 → 1, 1.6s ease-in-out infinite.
- **키보드**: Space = 녹음 토글(입력 필드 포커스 시 제외).
- **반응형**: 1280px 미만에서는 1행을 세로 스택(질문 카드 위, 녹음 버튼 아래 풀폭)으로. 모바일은 이번 범위 밖.
- **접근성**: 영상 위 텍스트는 스크림 덕에 대비 확보. 버튼에 aria-label, 상태 배지는 `aria-live="polite"`로 질문 번호 갱신 알림.

## State Management
- `currentQuestionIndex`, `totalQuestions` (기존 세션 상태 재사용)
- `recordingState: 'idle' | 'recording' | 'processing' | 'review'`
- `micVolume`, `speakerVolume` (기존 슬라이더 상태 이관)
- `isTtsPlaying` (다시 듣기 버튼 disabled 처리)
- 데이터 페칭·제출 API는 기존 그대로.

## Design Tokens
- Navy(브랜드): `#1A2A4A` / 다크 배경: `#0F172A`
- 흰색 텍스트: `#FFFFFF`, 보조 `rgba(255,255,255,.75)` / `.65` / `.6`
- 라이브 점: `#E74C3C`
- 글래스: 배경 `rgba(15,23,42,.5)`, border `rgba(255,255,255,.16)`, blur 14px
- Radius: pill 999px, 질문 카드 18px
- 폰트: Pretendard (코드베이스 기존 폰트 그대로)
- 간격: 헤더 60px, 좌우 여백 32px(헤더)/48px(하단), 요소 gap 9–24px

## Assets
- `interviewer-feed.png`: 레퍼런스용 면접관 스틸 이미지 — 실제 구현에서는 기존 면접관 영상 스트림으로 대체. 새 에셋 불필요.
- 아이콘(🎙⟲🛡🎤🔊)은 레퍼런스에서 이모지로 표기 — 코드베이스의 아이콘 세트(lucide 등)로 교체할 것.

## Files
- `session-theater.html` — 디자인 레퍼런스 (브라우저에서 열어 1440×900로 확인)
- `interviewer-feed.png` — 레퍼런스 이미지
