# AI-Evaluate 개발일지 (2026-07-29)

음성(voice) teacher pseudo-labeling부터 student MLP 학습, sanity check, 점수 산출 로직 개편까지 - 오늘 하루 동안 실제로 실행하고 결정한 내용을 시간 순으로 정리한다. 설계 배경/teacher 선정 근거 자체는 `ai-evaluate-handoff.md`, `ai-evaluate-handoff-voice-teacher.md`(프로젝트 최상단)에 이미 정리돼 있으므로 이 문서는 **오늘 실제로 돌린 작업과 그 결과**만 다룬다.

---

## 1. 실행 환경 준비

- `ai-evaluate/` 에 가상환경(`venv`) 생성 후 `pip install -r requirements.txt -r requirements-train.txt` 실행.
- Windows 콘솔 기본 인코딩(cp949)이 UTF-8로 작성된 requirements 파일의 박스 문자(`──`)를 못 읽어 `UnicodeDecodeError` 발생 → `export PYTHONUTF8=1` 로 해결. 이후 모든 학습 스크립트 실행 전에 이 환경변수를 매번 설정.

## 2. teacher(jungjongho) pseudo-labeling

- 데이터: 프로젝트 상위 폴더의 `AIHUB_채용면접_음성샘플데이터/01.원천데이터`(직군/성별/경력별 중첩 폴더, 답변 파일 1301개 `_a_*.wav`, 질문 파일은 `_q_*` 로 필터링해서 제외).
- 최초 CPU로 실행 → 진행 속도가 느려(전체 예상 235분) 도중에 GPU(RTX 4050) 전환 결정.
  - `pip uninstall torch -y && pip install torch==2.4.1 --index-url https://download.pytorch.org/whl/cu121` 로 CUDA 지원 torch 재설치.
  - `training/voice/make_pseudo_labels.py` 에 `--device` 옵션 및 자동 GPU 감지 코드 추가(`load_teacher`/`run_audeering`/`run_jungjongho`가 모델·입력을 지정 device로 이동하도록 수정).
  - 재실행 결과: `[device] cuda 사용` 확인, `nvidia-smi` 로 GPU 사용률 100%/VRAM 1.7GB 확인.
- 최종 실행 명령:
  ```bash
  python -m training.voice.make_pseudo_labels \
      --teacher jungjongho \
      --audio "<AIHUB 채용면접 음성 원천데이터 경로>" \
      --recursive --filename-contains "_a_" \
      --out data/processed/voice_pseudo_labels_jungjongho.csv \
      --window 15
  ```
- 결과: 답변 1301개 → 15초 윈도우 분할 후 **6,809개 청크**, `voice_pseudo_labels_jungjongho.csv` 생성 완료(헤더 포함 6,810줄).
- 참고: 진행 상황 확인 중 원격 마운트 폴더의 디렉토리 리스팅이 한동안 캐시되어 실제 진행과 다른 값을 보여주는 현상이 있었음 → 파일 개수 대신 터미널 로그(현재 처리 중인 파일명)로 진행률을 판단하는 방식으로 전환.

## 3. train/holdout 랜덤 스플릿

- 신규 스크립트: `training/voice/split_holdout.py`
- 원본 답변(`source_clip`) 단위로 완전 무작위 85/15 분리(seed=42, 재현 가능). 같은 답변에서 나온 윈도우는 항상 같은 쪽으로 묶어 train/val(또는 train/holdout) 누수를 방지.
- 직군별 계층화는 하지 않기로 결정(음성 신호는 직군과 무관, 서비스도 개발자 전용이라 불필요). 성별도 표본 규모(1301개)면 무작위로도 자연스럽게 섞인다고 판단.
- 실행 결과:
  ```
  원본 답변(source_clip) 총 1301개 -> train 1106개 / holdout 195개
  윈도우(행) 기준 -> train 5809개 / holdout 1000개
  ```
- 산출물: `voice_pseudo_labels_train.csv`(학습용), `voice_pseudo_labels_holdout.csv`(학습에 절대 미사용, 최종 검증 전용).

## 4. 피처 추출 (build_dataset)

```bash
python -m training.voice.build_dataset \
    --teacher jungjongho \
    --audio data/processed/audio_chunks \
    --labels data/processed/voice_pseudo_labels_train.csv \
    --out data/processed/voice_dataset.npz
```

- train CSV만 사용(holdout 195개는 여기 전혀 관여하지 않음).
- 결과: `X=(5809, 38)`, `y=(5809, 2)` (`voice_dataset.npz`). 38차원 = F0 통계 3 + RMS 2 + 휴지/속도/길이 4 + jitter/shimmer/HNR 3 + MFCC 26.

## 5. student MLP 학습 (distillation)

```bash
python -m training.voice.train_mlp \
    --teacher jungjongho \
    --data data/processed/voice_dataset.npz --group-split
```

- GPU 사용 여부를 검토했으나, 이 모델은 입력 38차원 → 은닉(64,32) → 출력 2차원의 초소형 MLP(파라미터 수천 개 수준)라 GPU 이전 오버헤드가 계산 이득보다 커서 **CPU로 그대로 실행**하기로 결정.
- 결과:
  ```
  저장 완료: core/voice/model/voice_mlp.pt / core/voice/model/voice_scaler.json (best val loss=0.0481)
  confidence r=0.809
  tension    r=0.809
  ```
- r=0.809로 두 축 모두 "경량 피처만으로 teacher를 잘 근사"하는 기준(r≥0.6)을 충분히 넘김. 다만 이는 "student가 teacher를 잘 흉내냈는가"에 대한 지표일 뿐, teacher 라벨 자체(TENSION_WEIGHTS 휴리스틱)의 타당성은 별도로 sanity check 필요.
- 이 단계에서 처음으로 `core/voice/model/`에 실제 모델 파일(.pt/.json)이 생성됨 — 이전까지는 `.gitkeep`만 있는 빈 폴더였음.

## 6. 점수 산출 로직 1차 추가 (10점 환산)

- BE가 바로 쓸 수 있도록 `confidence_score`(0~1)를 10점 만점으로 스케일한 `confidence_score_10` 필드를 응답에 추가(재학습 불필요, 순수 후처리).
- 변경 파일: `core/voice/predictor.py`, `api/schemas/analysis.py`, `docs/SPRING_INTEGRATION.md`.

## 7. sanity check 표본 추출

- 신규 스크립트: `training/voice/sanity_check_sample.py`
- holdout(195개 답변)에서 각 답변당 대표 윈도우 1개씩만 선정(같은 답변 중복 청취 방지), tension_score 기준 low/mid/high 각 12개(총 36개) 추출.
- 학습된 모델이 있으면 teacher 라벨과 student 예측값(`pred_confidence`, `pred_tension`)을 나란히 기록해 "teacher가 틀렸는지 student가 틀렸는지"를 구분할 수 있게 함.
- 산출물: `data/processed/sanity_check/`(wav 36개 + `sanity_check_summary.csv`).

## 8. 점수 산출 로직 재설계 (여키스-도슨 곡선)

- 사용자 피드백: "confidence 높을수록(=tension 낮을수록) 좋은 점수"가 아니라, **적당히 긴장한 상태가 가장 좋은 점수**여야 한다는 판단(너무 편안하면 오히려 감점). 여키스-도슨 법칙(각성-수행 역U자 관계)과 부합.
- 결정 사항:
  - 이상적 긴장 지점(`voice_ideal_tension`)은 하드코딩하지 않고 sanity check 결과를 들어본 뒤 조정하기로 함(잠정값 `0.4`).
  - 감점은 좌우 대칭(너무 편안함 vs 너무 긴장함을 동일한 폭으로 감점).
- 구현(재학습 불필요, 응답 후처리 로직만 변경):
  - `config.py`: `voice_ideal_tension: float = 0.4`, `voice_tension_score_width: float = 0.25` 추가.
  - `core/voice/predictor.py`: `confidence_score_10` → **`interview_score_10`** 으로 개명, 아래 가우시안(종형) 곡선으로 계산.
    ```
    interview_score_10 = 10 * exp( -(tension_score - ideal)^2 / (2 * width^2) )
    ```
    (ideal=0.4, width=0.25 기준 tension=0.0→2.8점, tension=0.4→10.0점, tension=1.0→0.6점)
  - `api/schemas/analysis.py`, `docs/SPRING_INTEGRATION.md`: 필드명/설명 갱신.
  - `training/voice/sanity_check_sample.py`: 요약 CSV에 `pred_interview_score_10` 컬럼 추가.
- sanity check 스크립트를 이 변경 이후 재실행하여 `pred_interview_score_10` 값까지 포함된 최신 결과 확보.

## 9. student 정확도 개선 논의 + 피처 2종 추가 (38차원 → 44차원)

- student(r=0.809)가 teacher 를 더 잘 근사하도록 개선 후보 4개를 논의:
  1. 데이터 늘리기(AIHub 정식 데이터셋, 겹치는 윈도우로 증강)
  2. 피처 보강(피치 시간패턴/스펙트럼/필러워드)
  3. 모델·학습 설정 조정(hidden_dims, 앙상블 등)
  4. teacher 라벨 품질 자체 개선(gold 라벨 혼합, audeering 앙상블)
- 이 중 **필러워드(STT 기반)는 보류**하기로 함 - training-serving 로직 공유 원칙상 서빙 때도 STT를 상시로 돌려야 하는데, 레이턴시는 `@Async` 구조상 문제 없지만(면접 중 백그라운드 처리) 같은 EC2에서 LiveKit과 CPU/메모리를 나눠 쓰는 자원 경합 문제가 남아있어 별도 검토 필요. 나중에 가벼운 한국어 STT 모델 후보를 다시 조사하기로 하고 일단 후순위로 미룸.
- 이번엔 그 중 **가벼운 두 후보(피치 시간패턴, 스펙트럼 특징)를 `core/voice/feature_extractor.py`에 실제로 추가**함(재학습은 필요하지만 teacher 재실행은 불필요 - 라벨은 원본 오디오에서 나오는 것이라 피처 차원과 무관):
  - `f0_delta`/`f0_slope`: 이미 계산해두던 Praat Pitch 객체의 프레임별 F0 배열(`pitch.selected_array["frequency"]`)에서 전/후반 평균 차이와 선형회귀 기울기를 추가 계산. 표정 쪽 `aggregator.py`의 `ear_delta`/`dev_slope`와 같은 발상(평균만으론 사라지는 "시간에 따른 변화" 복원).
  - `formant1`/`formant2`: Praat `To Formant (burg)` 호출 추가(성도 긴장 시 공명주파수 이동 포착 목적). 성별을 미리 모르므로 최대 포먼트 주파수는 성인 평균 근사치(5500Hz)로 고정.
  - `spectral_centroid_mean`/`spectral_centroid_std`: librosa `spectral_centroid`(목소리의 밝기/거칠기, MFCC와 같은 STFT 프레임 재사용이라 추가 비용 미미).
  - `FEATURE_DIM`: 38 → **44**로 변경.
- ⚠️ 이 6개 신규 피처도 jitter/shimmer 와 마찬가지로 "면접 긴장도와 실제 상관 있는지"는 아직 미검증 - 재학습 후 축별 상관계수로 기여도 확인 필요. 기여 없는 피처는 다음 정리 때 제거 대상.
- **재학습 필요**: `FEATURE_DIM`이 바뀌었으므로 기존 `voice_mlp.pt`(38차원 기준)는 더 이상 못 쓴다(`predictor.py`의 `in_dim` 불일치 검증에 걸려 로드 자체가 막힘). teacher pseudo-labeling(`make_pseudo_labels.py`)과 train/holdout 분리(`split_holdout.py`)는 라벨/스플릿 로직이라 재실행 불필요, **`build_dataset.py`와 `train_mlp.py`만 다시 실행**하면 됨.
- 실제로 재실행 완료. `build_dataset.py` → `X=(5809, 44)` 확인. `train_mlp.py` 결과:
  ```
  early stopping at epoch 113 (best val=0.0474)
  confidence r=0.833
  tension    r=0.833
  ```
  38차원 대비 **r 0.809 → 0.833, val loss 0.0481 → 0.0474**로 개선 확인 - 소폭이지만 방향은 맞았음. 축별(피처별) 상관계수까지 뜯어보는 진단은 아직 안 함(다음 할 일로 남겨둠).

---

## 10. 오늘 기준 전체 진행 상태

| 단계 | 상태 |
|---|---|
| 음성 teacher pseudo-labeling | 완료 (6,809개 청크) |
| train/holdout 분리 | 완료 (1106/195, source_clip 단위) |
| 피처 추출(build_dataset) | 완료 - 44차원 기준 재실행 완료 (X=5809×44) |
| student MLP 학습 | 완료 - 44차원 기준 재학습 완료 (r=0.833, val loss=0.0474, `voice_mlp.pt` 갱신) |
| 10점 만점 점수 로직 | 완료 (`interview_score_10`, 종형 곡선) |
| sanity check | 38차원 구모델 기준으로만 실행됨. **44차원 신모델 기준 재실행 필요(미실행)** |
| 표정(face) 파이프라인 | 미착수 (라벨 데이터 없음) |
| BE 실 연동/배포 | 미착수 |

## 11. 다음에 이어서 할 일

- [ ] `training/voice/sanity_check_sample.py` 재실행 (44차원 신모델 기준 `pred_interview_score_10` 갱신) 후 직접 청취
- [ ] 축별 상관계수 확인 후 신규 피처(f0_delta/slope, formant1/2, spectral_centroid) 및 기존 jitter/shimmer의 실제 기여도 재평가 - 기여 없는 축은 제거 검토
- [ ] 위 청취 결과로 `voice_ideal_tension`/`voice_tension_score_width` 최종 확정
- [ ] jungjongho `TENSION_WEIGHTS` 자체의 타당성도 sanity check으로 같이 검증(teacher 라벨 신뢰도 문제는 여전히 미해결 이슈)
- [ ] 필러워드(STT) 후보 - 가벼운 한국어 STT 모델 조사 + EC2 자원 경합(LiveKit과 CPU/메모리 공유) 영향 검토 후 도입 여부 재결정
- [ ] 표정(face) teacher(EMO-AffectNet) pseudo-labeling부터 동일 파이프라인 진행
- [ ] `.env` 파일 작성 후 서버(`docker compose up`) 실제 기동 테스트
- [ ] BE(Spring) 쪽에서 `interview_score_10` 필드 반영 여부 확인
