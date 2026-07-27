// 스터디 라운지·그룹 페이지 상단을 은은하게 밝히는 장식용 글로우 레이어다.
// 부모 콘텐츠 래퍼가 relative isolate로 스태킹 컨텍스트를 만들어야 흰 배경 위에 보인다.
export function StudyHeroGlow() {
  return <div aria-hidden="true" className="study-hero-glow" />
}
