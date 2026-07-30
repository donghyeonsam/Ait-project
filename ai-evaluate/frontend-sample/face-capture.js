/**
 * [프론트 참고 구현] MediaPipe JS 로 표정 프레임 벡터를 수집해 ai-evaluate 로 전송한다.
 *
 * 설치:
 *   npm i @mediapipe/tasks-vision
 *
 * 모델 파일(face_landmarker.task)은 학습 때 쓴 것과 반드시 같은 파일이어야 한다.
 * public/ 에 두고 서빙하거나 CDN 경로를 그대로 써도 된다.
 *
 * ⚠️ EAR/MAR/deviation 계산은 파이썬의 core/face/landmark_metrics.py 와 정확히
 *    같아야 한다. 수식이나 랜드마크 인덱스를 바꾼다면 양쪽을 함께 고치고,
 *    training/face/verify_parity.py 로 결과가 일치하는지 확인할 것.
 */

import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

// ── 파이썬 core/face/landmark_metrics.py 와 동일한 상수 ──
const LEFT_EYE = [33, 133, 159, 145, 158, 153];
const RIGHT_EYE = [362, 263, 386, 374, 385, 380];
const MOUTH = [61, 291, 13, 14];
const NOSE_TIP = 1;

// 학습 시 사용한 샘플링 fps 와 맞춘다(training/face/extract_frames.py 의 SAMPLE_FPS).
const SAMPLE_FPS = 5;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * 눈/입의 열린 정도. 수직거리 평균 / 수평거리.
 * 수평거리로 나눠 카메라와의 거리에 무관한 지표로 만든다.
 */
function aspectRatio(pts, idx) {
  const horizontal = dist(pts[idx[0]], pts[idx[1]]);
  if (horizontal < 1e-6) return 0.0;
  let vertical = dist(pts[idx[2]], pts[idx[3]]);
  if (idx.length >= 6) {
    vertical = (vertical + dist(pts[idx[4]], pts[idx[5]])) / 2.0;
  }
  return vertical / horizontal;
}

function frameMetrics(landmarks) {
  const ear =
    (aspectRatio(landmarks, LEFT_EYE) + aspectRatio(landmarks, RIGHT_EYE)) / 2.0;
  const mar = aspectRatio(landmarks, MOUTH);
  const nose = landmarks[NOSE_TIP];
  // 코끝이 화면 중앙(0.5, 0.5)에서 벗어난 거리 = 머리 방향 근사치
  const deviation = Math.hypot(nose.x - 0.5, nose.y - 0.5);
  return { ear, mar, deviation };
}

export class FaceCapture {
  constructor({ modelPath, wasmPath }) {
    this.modelPath = modelPath;
    this.wasmPath =
      wasmPath ||
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
    this.landmarker = null;
    this.frames = [];
    this.startedAt = null;
    this.timer = null;
  }

  async init() {
    const fileset = await FilesetResolver.forVisionTasks(this.wasmPath);
    this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath: this.modelPath,
        // GPU 델리게이트가 훨씬 빠르지만, 저사양/구형 기기에서는 실패할 수 있다.
        // 실패 시 "CPU" 로 폴백하도록 감싸는 것을 권장한다.
        delegate: "GPU",
      },
      outputFaceBlendshapes: true,        // 우리 피처의 주재료(52차원)
      outputFacialTransformationMatrixes: false,
      numFaces: 1,                         // 1인 촬영 전제 (연산량 절감)
      // VIDEO 모드: 프레임 간 추적으로 IMAGE 모드보다 안정적이다.
      // 단 timestamp 를 단조 증가시켜 넣어야 한다.
      runningMode: "VIDEO",
    });
  }

  /** videoEl: 카메라 스트림이 연결된 <video> 엘리먼트 */
  start(videoEl) {
    this.frames = [];
    this.startedAt = performance.now();

    const intervalMs = 1000 / SAMPLE_FPS;
    this.timer = setInterval(() => {
      if (videoEl.readyState < 2) return; // 아직 프레임이 준비되지 않음

      const ts = performance.now();
      const result = this.landmarker.detectForVideo(videoEl, ts);
      if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
        return; // 얼굴 미검출 프레임은 버린다(파이썬 쪽과 동일한 처리)
      }

      const landmarks = result.faceLandmarks[0];
      const { ear, mar, deviation } = frameMetrics(landmarks);

      // ⚠️ categories 배열의 순서(index 순)를 그대로 유지한다.
      //    이름순 정렬 등으로 순서를 바꾸면 학습된 모델과 축이 어긋나는데,
      //    에러 없이 값만 틀리게 나와 발견이 매우 어렵다.
      const blendshapes = result.faceBlendshapes[0].categories.map((c) => c.score);

      this.frames.push({ blendshapes, ear, mar, deviation });
    }, intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** 서버로 보낼 페이로드. 90초 x 5fps = 450 프레임 -> JSON 300KB 안팎. */
  buildPayload() {
    const durationSec = (performance.now() - this.startedAt) / 1000;
    return {
      fps: SAMPLE_FPS,
      duration_sec: durationSec,
      frames: this.frames,
    };
  }

  /**
   * 분석 요청. 표정은 서버에서 동기 처리되므로 응답에 결과가 바로 담겨 온다
   * (음성처럼 task_id 로 폴링하지 않는다).
   */
  async analyze(apiBase = "/api/media") {
    const payload = this.buildPayload();
    if (payload.frames.length < 5) {
      throw new Error("얼굴이 검출된 프레임이 너무 적습니다. 조명과 카메라 위치를 확인해주세요.");
    }
    const res = await fetch(`${apiBase}/analyses/face`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `분석 실패 (${res.status})`);
    }
    return res.json(); // { status, face: { tension_score, blink_per_minute, ... } }
  }

  /**
   * [검증용] 수집한 프레임을 JSON 파일로 내려받는다.
   * training/face/verify_parity.py 로 파이썬 추출 결과와 비교할 때 쓴다.
   * 프로젝트 초기에 딱 한 번은 반드시 확인할 것.
   */
  downloadDebugJson(fileName = "frames_js.json") {
    const blob = new Blob([JSON.stringify(this.buildPayload())], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}

/* ── 사용 예시 ──────────────────────────────────────────────
const capture = new FaceCapture({ modelPath: "/models/face_landmarker.task" });
await capture.init();

const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
videoEl.srcObject = stream;
await videoEl.play();

capture.start(videoEl);          // 답변 시작
// ... 사용자가 답변 ...
capture.stop();                  // 답변 종료
const result = await capture.analyze();
console.log(result.face.tension_score);
─────────────────────────────────────────────────────────── */
