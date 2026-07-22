# Ait UI Asset Pack

세 개의 대시보드/리포트 화면에서 사용된 시각 요소를 SVG로 재구성한 에셋 팩입니다.

## 구성

- `ait-logo.svg`: Ait 워드마크
- `icon-users.svg`: 이번 주 모의면접
- `icon-network.svg`: 최근 종합점수/AI 분석
- `icon-laptop.svg`: 누적 스터디
- `icon-flag.svg`: 목표 달성률
- `icon-fire.svg`: 연속 연습
- `icon-bell.svg`: 알림
- `icon-thumbs-up.svg`: 잘한 점
- `icon-trend-square.svg`: 개선하면 좋은 점
- `icon-play.svg`: 영상 다시보기
- `icon-chevron-down.svg`, `icon-chevron-right.svg`: 펼치기/이동
- `radar-chart-base.svg`: 역량 분석 레이더 차트
- `study-logo-naver.svg`, `study-logo-kakao.svg`, `study-logo-samsung.svg`: 스터디 목록용 브랜드 배지
- `preview.html`: 전체 에셋 미리보기

## 사용법

일반 아이콘은 `stroke="currentColor"` 방식이라 CSS의 `color`로 색을 바꿀 수 있습니다.

```css
.icon {
  width: 24px;
  height: 24px;
  color: #1a2a4a;
}
```

레이더 차트의 데이터 폴리곤은 `--radar-fill`, `--radar-stroke` CSS 변수로 조정할 수 있습니다.

> 스크린샷에서 다시 그린 벡터 에셋이므로 기존 원본 로고 파일이 있다면 실제 서비스에서는 원본을 우선 사용하세요.
