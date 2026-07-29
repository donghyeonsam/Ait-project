# BE(Spring Boot) 연동 가이드

ai-evaluate 서버를 Spring 에서 어떻게 부르는지 정리한 문서.

---

## 큰 그림

```
[표정]
  브라우저에서 얼굴 인식 → 숫자 묶음 생성
     ↓ (BE 를 거쳐도 되고, 프론트가 직접 불러도 됨)
  POST /analyses/face  →  점수 바로 받음

[음성]
  브라우저에서 녹음 → 소리 파일
     ↓
  BE 가 바이트로 읽어서 전달
     ↓
  POST /analyses/voice  →  점수 바로 받음 (2~3초 걸림)
     ↓
  Redis 에 저장
```

음성은 **요청 한 번에 결과까지 돌아온다.** 번호표 받고 나중에 물어보는 방식이 아니다.
BE 가 이미 `@Async` 로 별도 스레드에서 부르고 있으니, 거기서 2~3초 기다려도
사용자 화면은 멈추지 않기 때문이다.

---

## 음성 분석 호출

### 요청

```
POST http://ai-evaluate:8100/analyses/voice
Content-Type: multipart/form-data

file:       (소리 파일 바이트, 파일 이름 필수)
request_id: (선택) 로그 추적용 식별자. 예: "42-3" = 면접 42번의 3번째 질문
```

`request_id` 를 넣으면 서버 로그가 이렇게 찍혀서, 요청이 여러 개 동시에 들어와도
어느 것이 어떻게 됐는지 추적할 수 있다.

```
[voice][42-3] 접수 (.webm, 812.3KB)
[voice][42-3] 분석 시작
[voice][42-3] 분석 완료
```

### 응답 (200)

```json
{
  "score": 8.1
}
```

| 필드 | 뜻 | 범위 |
|---|---|---|
| `score` | 답변 종합 점수(10점 만점). ⚠️ 자신감이 높을수록 좋은 점수가 아니다 - 적당히 긴장한 상태를 정점으로 하는 종형 곡선이라, 너무 편안해도 너무 긴장해도 둘 다 감점된다. 정점 위치는 `voice_ideal_tension`(`config.py`)로 조정하며, sanity check 결과를 보고 튜닝한 값이다. | 0~10 |

⚠️ [2026-07-29] 응답을 이 필드 하나로 좁혔다. 이전 버전은 `confidence_score`/`tension_score`/`speech_rate`/`pause_ratio`도 같이 내려줬으나, BE 스펙을 종합 점수 하나만 노출하는 것으로 확정했다. 내부적으로는 `core/voice/predictor.py`가 여전히 그 값들을 계산한다(점수 산출에 필요) - 나중에 근거 데이터를 BE/FE 에 다시 보여줘야 하면 `api/schemas/analysis.py` 의 `VoiceResult` 에 필드만 다시 선언하면 된다(재학습 불필요).

⚠️ [teacher 교체] 이전 버전은 audeering(영어, arousal/valence/dominance 3축)을
teacher 로 썼으나, 한국어로 학습된 jungjongho 모델로 교체하면서 표정 쪽과 같은
confidence/tension 축으로 스키마를 통일했다. BE 코드가 이미 arousal/valence/dominance
필드로 파싱하고 있다면 이 변경을 함께 반영해야 한다.

### 실패 응답

| 코드 | 상황 | BE 가 할 일 |
|---|---|---|
| 400 | 확장자 미지원 / 1초 미만 / 빈 파일 / 파일 깨짐 | 보낸 데이터를 점검. 재시도해도 소용없음 |
| 413 | 파일이 너무 큼 (기본 30MB 초과) | 잘못된 파일을 보냈는지 확인 |
| 503 | 아직 모델을 학습하지 않음 | 서버 준비 문제. 재시도 가치 있음 |
| 504 | 분석 시간 초과 (기본 120초) | 재시도 가치 있음 |
| 500 | 서버 내부 오류 | 서버 로그 확인 필요 |

400/413 은 **재시도해도 똑같이 실패**한다. 503/504 만 재시도 대상으로 두는 것이 좋다.

---

## Spring 코드 예시

```java
@Override
@Async
public void sendAudioToFastApiAsync(Long userId, Long aiInterviewId,
                                    byte[] audioBytes, String filename,
                                    String contentType) {
    log.info("[Async] FastAPI 음성 분석 요청, userId: {}, aiInterviewId: {}",
             userId, aiInterviewId);

    String key = "voice:" + userId + ":" + aiInterviewId;

    try {
        // ── 1. 바이트를 multipart 로 감싼다 ──
        // getFilename() 을 반드시 채워야 한다. 이게 비면 FastAPI 가 확장자를 몰라
        // 400 에러를 낸다. 서버는 이 확장자를 보고 "webm 이니까 이렇게 열자" 를 정한다.
        ByteArrayResource resource = new ByteArrayResource(audioBytes) {
            @Override
            public String getFilename() {
                return filename;   // 예: "answer_3.webm"
            }
        };

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", resource);
        // 선택 항목. 넣어두면 서버 로그에서 이 요청을 찾아낼 수 있다.
        body.add("request_id", aiInterviewId + "-" + questionNo);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        // ── 2. 호출 (2~3초 걸린다) ──
        VoiceScoreResponse result = restTemplate.postForObject(
                aiMediaBaseUrl + "/analyses/voice",
                new HttpEntity<>(body, headers),
                VoiceScoreResponse.class);

        // ── 3. Redis 에 하나씩 쌓기 ──
        redisTemplate.opsForList().rightPush(key, result);
        // 유통기한을 꼭 걸어둔다. 안 걸면 데이터가 계속 쌓여 메모리가 찬다.
        redisTemplate.expire(key, Duration.ofHours(6));

    } catch (Exception e) {
        log.error("[Async] FastAPI 음성 분석 실패, userId: {}, aiInterviewId: {}",
                  userId, aiInterviewId, e);

        // 로그만 남기면 프론트는 '아직 분석 중인지 실패한 건지' 구분할 수 없다.
        // 실패 표시를 넣어두면 화면에서 "분석 실패" 를 보여줄 수 있다.
        redisTemplate.opsForList().rightPush(key, VoiceScoreResponse.failed());
        redisTemplate.expire(key, Duration.ofHours(6));
    }
}
```

### ⚠️ 반드시 설정해야 하는 것 - 타임아웃

분석에 2~3초가 걸리므로, `RestTemplate` 의 읽기 대기 시간을 넉넉히 잡아야 한다.
기본값이 짧으면 분석이 끝나기도 전에 BE 가 먼저 연결을 끊어버린다.

```java
@Bean
public RestTemplate aiMediaRestTemplate(RestTemplateBuilder builder) {
    return builder
            .setConnectTimeout(Duration.ofSeconds(5))   // 연결까지 5초
            .setReadTimeout(Duration.ofSeconds(60))     // 응답 기다리기 60초
            .build();
}
```

### 응답 받을 DTO

```java
public record VoiceScoreResponse(
        double score   // 답변 종합 10점 점수. JSON 필드명도 score 라 별도 매핑 설정이 필요 없다.
) {
    public static VoiceScoreResponse failed() {
        return new VoiceScoreResponse(-1);
    }
}
```

---

## 동시 실행 개수 제한 (중요)

`@Async` 스레드풀이 크면 요청이 한꺼번에 몰린다. 음성 분석은 CPU 를 많이 써서,
동시에 여러 개가 돌면 같은 서버의 **화상면접(LiveKit)이 끊기기 시작한다.**

ai-evaluate 쪽에 이미 제한 장치가 있다(`.env` 의 `VOICE_CONCURRENCY=2`).
초과분은 서버 안에서 순서대로 기다렸다 처리되므로 요청이 실패하진 않는다.
다만 **기다리는 시간만큼 응답이 늦어지므로** BE 의 읽기 대기 시간을 넉넉히 잡아야 한다.

Spring 쪽에서도 스레드풀 크기를 과하게 잡지 않는 것을 권장한다.

```java
@Bean(name = "audioAnalysisExecutor")
public Executor audioAnalysisExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(2);
    executor.setMaxPoolSize(4);
    executor.setQueueCapacity(50);
    executor.setThreadNamePrefix("audio-");
    executor.initialize();
    return executor;
}
```

---

## 소리 파일 형식에 대한 주의

브라우저가 녹음하면 보통 `.webm` 형식이 나온다. 그대로 보내면 된다.
다만 두 가지만 지켜야 분석이 정확하다.

1. **바이트를 만들 때 아무것도 변환하지 말 것.** 받은 그대로 넘긴다.
   바이트 자체는 파일과 완전히 같은 데이터라 분석 결과에 차이가 없다.

2. **샘플레이트(녹음 촘촘함)를 낮추지 말 것.** 브라우저 기본값(48000)을 그대로 둔다.
   낮추면 목소리 떨림을 측정하는 정밀도가 떨어진다.

그리고 학습할 때 쓰는 음성도 **서비스와 같은 형식을 거치게** 해야 한다.
학습은 압축 안 한 wav 로 하고 서비스는 압축된 webm 을 받으면, 목소리 떨림 수치가
서로 달라져 모델이 엉뚱한 판단을 한다. 자세한 건 README 4-2 참고.

---

## 표정 분석 호출

표정은 프론트가 직접 부르는 것이 자연스럽다(브라우저에서 계산한 숫자를 그대로 보내므로).
BE 를 거치려면 프론트가 보낸 JSON 을 그대로 전달하면 된다.

```
POST http://ai-evaluate:8100/analyses/face
Content-Type: application/json

{
  "fps": 5.0,
  "duration_sec": 92.4,
  "frames": [
    { "blendshapes": [0.01, 0.03, ...52개...], "ear": 0.31, "mar": 0.12, "deviation": 0.04 },
    ...
  ]
}
```

응답:

```json
{
  "status": "succeeded",
  "face": {
    "tension_score": 0.63,
    "confidence_score": 0.37,
    "blink_per_minute": 24.1,
    "gaze_off_ratio": 0.22,
    "analyzed_frames": 462
  }
}
```

`confidence_score` 는 `1 - tension_score` 다. 음성 쪽과 마찬가지로 BE 가 매번
1-x 계산을 하지 않도록 편의상 함께 내려준다.
