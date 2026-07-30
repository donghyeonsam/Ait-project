# 미연동 항목과 백엔드 요청 목록

작성일: 2026-07-27
기준 스펙: `http://i15d202.p.ssafy.io/v3/api-docs` (엔드포인트 35개)

프론트에서 목업으로 남아 있는 화면과, 그 이유를 정리한 문서다.
"프론트에서 더 할 수 있는 일이 없는 항목"과 "백엔드 응답에 필드만 추가되면 되는 항목"을 구분했다.

---

## 1. 연동 완료 (이 문서의 대상 아님)

참고용으로 이번에 목업을 걷어낸 범위만 적어 둔다.

| 화면 | 엔드포인트 |
| --- | --- |
| 스터디 라운지 목록·검색·정렬 | `GET /api/study-groups` |
| 마이 스터디 목록 | `GET /api/study-groups/me/all` |
| 스터디 생성 | `POST /api/study-groups` |
| 그룹 상세·구성원 목록 | `GET /api/study-groups/{groupId}` |
| 모집 상태 변경 | `PATCH /api/study-groups/{groupId}/status` |
| 화상 세션 시작 | `POST /api/study-groups/{groupId}/sessions` |
| 가입 신청·신청 목록 조회·승인/거절 | `POST/GET /api/study-groups/{groupId}/applications`, `PATCH .../applications/{applicationId}` |
| 입장 전 자소서 선택 | `GET /api/cover-letters/me` |
| 세션 접속 정보 | `POST /api/study-sessions/{sessionId}/connection` |

---

## 2. 응답에 필드만 추가되면 되는 항목 (요청 우선순위 높음)

프론트 코드는 이미 자리를 비워 뒀다. 백엔드에서 필드만 채워 주면 바로 붙는다.

### 2-1. `GET /api/study-groups` — 현재 인원수 누락

현재 응답: `id, title, description, capacity, groupStatus, createdAt`

`currentMemberCount`가 없어서 라운지 카드가 `3/6명`을 못 쓰고 **`정원 6명`으로만** 표시된다.
`GET /api/study-groups/me/all`에는 이미 `currentMemberCount`가 있으므로 같은 필드를 목록에도 넣어 주면 된다.

- 프론트 대응 위치: [`src/components/study/StudyCard.tsx`](../src/components/study/StudyCard.tsx) — `currentMembers`가 `undefined`일 때만 정원 표기로 대체한다.

### 2-2. `POST /api/study-groups` — 정원·직군을 못 보냄

현재 요청 스키마: `{ title, description }`

정원(`capacity`)과 직군을 받을 자리가 없어서 **생성 Dialog에서 해당 입력을 제거**했다.
정원은 카드·구성원 패널이 이미 쓰고 있는 값이라 우선순위가 높다.

- 프론트 대응 위치: [`src/components/study/StudyCreateDialog.tsx`](../src/components/study/StudyCreateDialog.tsx)

### 2-3. 스터디 그룹에 직군(role) 정보 없음

`StudyRole`(프론트엔드/백엔드/AI/PT면접 …)에 해당하는 필드가 어느 응답에도 없다. 이 때문에:

- 라운지 카드의 **직군 배지가 렌더되지 않는다**
- 라운지의 **직군 필터와 빠른 필터 칩을 제거**했다 ([`StudySearchFilters.tsx`](../src/components/study/StudySearchFilters.tsx))

### 2-4. `GET /api/study-groups/{groupId}` — 모집 상태 누락

`GroupDetailResponse`에 `groupStatus`가 없어서, 그룹 페이지가 모집 상태 토글의 초깃값을 채우려고
`GET /api/study-groups/me/all`을 **추가로 한 번 더 호출**하고 있다. 상세 응답에 `groupStatus`가 들어오면 이 호출을 없앨 수 있다.

- 프론트 대응 위치: [`src/pages/StudyGroupPage.tsx`](../src/pages/StudyGroupPage.tsx)

### 2-5. `GET /api/study-groups/me/all` — owner 여부·활성 세션 정보 누락

마이 스터디 카드에 "그룹장/그룹원" 뱃지와 실시간 세션 상태(진행 중 표시, "세션 참여하기"/"세션 생성하기" 버튼 구분)를 넣어야 하는데, 이 응답에는 둘 다 없다.

- **owner 여부**: `MyStudyGroupResponseDto.from(StudyGroupMember member)`가 이미 `member`를 받고 있고, `member.isOwner()`가 `GroupDetailResponse.MemberInfo`에서 이미 쓰이고 있는 값이라 **필드 하나만 추가**하면 된다. 프론트는 임시로 그룹당 `GET /api/study-groups/{groupId}` 호출을 추가해 `ownerId`로 우회 계산 중이라(`MyStudySection.tsx`), 목록 응답에 필드가 생기면 이 N+1 호출을 없앨 수 있다.
- **활성 세션 정보**: `StudySessionRepository`에 `existsByStudyGroupIdAndStatusIn`, `findFirstByStudyGroupIdAndStatusInOrderByCreatedAtDesc`가 이미 있어 DB 조회는 가능하지만, 목록에 내려주는 필드/엔드포인트가 없다. 이게 없으면 실시간 상태 점은 항상 회색(비활성)으로만 표시되고, 그룹원은 진행 중인 세션이 있어도 참여할 방법이 없다 (3-4항과 동일한 근본 원인).

- 프론트 대응 위치: [`src/components/study/MyStudySection.tsx`](../src/components/study/MyStudySection.tsx)

---

## 3. 엔드포인트 자체가 없는 항목

프론트에서 우회할 방법이 없다. 해당 UI는 화면 동작만 하고 서버에 저장되지 않으며, 코드에 `// TODO: 실제 API 연동 필요` 주석을 남겨 뒀다.

### 3-2. 구성원 관리 (초대·내보내기·그룹장 위임)

셋 다 엔드포인트가 없어 화면 상태만 바뀐다. 새로고침하면 원래대로 돌아온다.

- 위치: [`StudyGroupPage.tsx`](../src/pages/StudyGroupPage.tsx) `inviteMember`, `removeMember`, `transferLeadership`

### 3-3. 그룹 삭제

`DELETE /api/study-groups/{groupId}`가 없다. 탈퇴(`/leave`)는 있지만 삭제와 의미가 다르므로 연결하지 않았다.
현재 "그룹 삭제" 확인 후 라운지로 이동만 한다.

### 3-4. 활성 세션 조회 — 그룹원이 세션에 못 들어감

`POST /api/study-groups/{groupId}/sessions`는 백엔드 `StudySessionService`에서

- **그룹장만** 호출할 수 있고 (`validateOwner`)
- 이미 활성 세션이 있으면 `STUDY_SESSION_ALREADY_ACTIVE`로 거절한다 (`validateNoActiveSession`)

그런데 **그룹의 현재 세션을 조회하는 엔드포인트가 없다.** 그래서:

- 그룹원은 세션에 참여할 방법이 없다 (그룹 페이지에서 안내 문구만 표시)
- 그룹장도 세션 생성 직후 받은 `sessionId`를 놓치면 다시 들어갈 수 없다

필요한 것: `GET /api/study-groups/{groupId}/sessions/active` (또는 그룹 상세 응답에 `activeSessionId` 포함)

이 항목이 해결되기 전까지 화상 스터디는 그룹장 1회 진입만 가능하다.

### 3-5. 세션 단건 조회

`GET /api/study-sessions/{sessionId}`가 없어 세션별 제목을 받을 수 없다.
입장 전 화면은 목업을 걷어내고 `GET /api/study-groups/{groupId}`의 그룹 제목으로 대신 표시하고 있어,
같은 그룹의 세션이 여러 번 열려도 제목이 구분되지 않는다.

- 위치: [`src/pages/StudySessionPrejoinPage.tsx`](../src/pages/StudySessionPrejoinPage.tsx)

### 3-6. 스터디 일정·출석

일정 CRUD와 출석 기록 엔드포인트가 없다. 캘린더는 목업 데이터로 CRUD UI만 확인 가능하다.

- 위치: [`StudyCalendar.tsx`](../src/components/study/StudyCalendar.tsx), [`src/mocks/study-lounge.ts`](../src/mocks/study-lounge.ts) `mockStudyCalendarEvents`

### 3-7. 그룹 공지

공지 CRUD 엔드포인트가 없다.
참고로 **실시간 채팅 자체는 LiveKit 데이터 채널로 이미 실연동**돼 있고, 공지만 목업이다.

- 위치: [`src/mocks/study-lounge.ts`](../src/mocks/study-lounge.ts) `mockStudyChatGroups`

### 3-8. 세션 평가 제출

평가 제출 엔드포인트가 없다. 평가 항목(`studyEvaluationCategories`)은 프론트 상수로만 존재한다.

- 위치: [`StudySessionRoom.tsx`](../src/components/study/StudySessionRoom.tsx), [`StudySessionSidePanel.tsx`](../src/components/study/StudySessionSidePanel.tsx)

### 3-9. 타인의 이력서·자소서 조회

`GET /api/resumes/me`, `GET /api/cover-letters/me`는 **본인 것만** 조회한다.
세션 참가자별 서류를 보려면 별도 권한 규칙이 있는 조회 API가 필요하다.
현재 상대방 항목은 "정보 없음"으로 표시된다.

### 3-10. 프로필 수정

사용자 정보 수정 엔드포인트가 없다. 마이페이지 프로필 수정은 화면에서만 반영된다.

- 위치: [`ProfileSection.tsx`](../src/components/mypage/ProfileSection.tsx)

### 3-11. 이메일 인증번호 발송·확인

회원가입의 인증번호 발송/확인 엔드포인트가 없다.
현재 이메일 형식만 검사하고, 코드가 입력되면 인증된 것으로 처리한다.

- 위치: [`SignupPage.tsx`](../src/pages/auth/SignupPage.tsx)

### 3-12. AI 면접 이력·리포트 점수

`GET /api/ai-interviews`는 이름과 달리 **면접 이력이 아니라 사전 준비 데이터**(자소서 목록 + 깃허브 저장소 목록)를 반환한다.
면접 결과·점수를 조회하는 엔드포인트가 없어 대시보드 리포트의 레이더 차트가 목업이다.

- 위치: [`ReportModal.tsx`](../src/components/dashboard/ReportModal.tsx)

### 3-13. 면접 답변 제출 — 요청 형식 미문서화

`POST /api/ai-interviews/{aiInterviewId}/answers`는 응답 스펙(`{ isPass, nextQuestion }`)은 확정됐지만
**Swagger에 requestBody가 비어 있다.** 녹음 파일을 multipart로 받는 것으로 보이는데 형식 확인이 필요하다.

- 위치: [`InterviewSessionPage.tsx`](../src/pages/InterviewSessionPage.tsx)

---

## 4. 배포 환경 관련 (백엔드/인프라)

프론트 코드 문제가 아니라 서버 설정 문제다.

1. **백엔드 HTTPS 미적용** — `https://i15d202.p.ssafy.io` (443)는 연결이 거부되고 `http://`만 응답한다.
   현재는 [`vercel.json`](../vercel.json)의 rewrite로 Vercel이 프록시해 우회 중이라, **Vercel ↔ 백엔드 구간이 평문 HTTP**다.
   인증서가 적용되면 rewrite의 destination을 `https://`로 바꿔야 한다.
2. **CORS 설정** — `setAllowedOrigins`에 localhost 3개만 등록돼 있고 `setAllowCredentials(false)`다.
   지금은 프록시로 same-origin이 되어 문제가 없지만, 프론트가 백엔드를 직접 호출하는 구조로 바뀌면 수정이 필요하다.
3. **`LIVEKIT_WS_URL` 확인 필요** — 세션 접속 정보의 `serverUrl`은 백엔드 환경변수에서 온다.
   기본값(`ws://localhost:7880`)이면 배포 환경에서 화상 연결이 되지 않는다.
4. **모든 엔드포인트가 `permitAll()`** — `SecurityConfig`가 개발 단계 설정이라 인증 없이 열려 있다.
   공개 도메인에 떠 있는 만큼 확인이 필요하다.
