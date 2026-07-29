핸드오프 — ai-evaluate 음성 teacher 모델 검토·결정 (이어서 진행용)
이 문서는 `ai-evaluate`(구 `ai-media`, 표정·음성 분석 서버) 설계 핸드오프 이후, 음성 teacher 모델을 다시 검토하고 몇 가지를 결정한 세션 내용을 압축한 것이다. 새 창에 붙여넣고 "여기서 이어서 하자"고 시작하면 된다. (기존 아키텍처/파일구조/최초 teacher 선정 근거는 별도 핸드오프 문서 `ai-evaluate-handoff.md` 참고 — 이 문서는 그 이후 세션 내용만 담음)

1. 배경 — 왜 다시 teacher를 검토했나
기존에 확정한 음성 teacher `jungjongho/wav2vec2-xlsr-korean-speech-emotion-recognition2_data_rebalance`가 다음 이유로 검증이 부실하다는 우려가 있었음:

* 1차 파인튜닝(한국어 ASR) 중간 모델 카드가 "Training data: None" + WER 0.38로 검증 부실 — 개인 튜토리얼 프로젝트일 가능성
* 최종 감정분류 검증 정확도 99.76%가 비정상적으로 높음 — 연기 발화 코퍼스일 가능성 의심

2. HF/Kaggle 대안 리서치 결과

* emotion2vec+ (알리바바): 가장 유력한 대안으로 조사됨. 특정 언어 텍스트 지도학습이 아니라 자기지도 사전학습으로 언어·시나리오에 걸친 감정표현을 학습하는 방식이라 언어 편향 문제가 jungjongho보다 적음. ACL 2024 논문 발표, SER 벤치마크 EmoBox(14개 언어, 32개 데이터셋)에서 라벨링 오류 감소용 기준 모델로 채택될 정도로 학계 검증됨. 출력은 9개 카테고리(angry/disgusted/fearful/happy/neutral/other/sad/surprised/unknown) — 기존 TENSION_WEIGHTS 방식과 유사하게 매핑 가능. base 버전 MIT 라이선스.
* audeering wav2vec2-large-robust-12-ft-emotion-msp-dim: 이미 코드에 `--teacher audeering` 보조옵션으로 있음. arousal/valence/dominance 연속출력, 검증 탄탄하나 영어(MSP-Podcast) 전용이라 한국어 domain gap.
* speechbrain/emotion-recognition-wav2vec2-IEMOCAP: 영어 IEMOCAP 4클래스, 검증은 잘 되어있으나 영어+연기발화라 참고용.
* facebook/wav2vec2-large-xlsr-53(Meta 원본): 53개 언어로 자기지도학습만 된 순수 표현모델 — 감정분류 head가 없어 그대로는 감정/자신감 라벨을 전혀 출력 못 함. jungjongho가 이 위에 감정분류 head를 얹어 파인튜닝한 것.
* 직접 파인튜닝 옵션: `kresnik/wav2vec2-large-xlsr-korean`(한국어 ASR 검증됨) 또는 Meta 원본에 AIHub 감정 데이터로 우리가 직접 파인튜닝 — 데이터/GPU/시간 공수가 커서 기각. gold 라벨 데이터가 충분히 쌓이고 시간 여유 생기면 나중에 고려할 스트레치 골로만 남김.

3. 최종 결정 사항

1. teacher는 jungjongho 유지 확정. 대안들을 검토했으나 교체 비용(파이프라인 전체가 jungjongho 기준으로 이미 구축됨) 대비 이득이 불확실해 현행 유지. 대신 검증(sanity check) 우선순위를 올리기로 함.
2. 다음 즉시 작업: 현재 코드가 실제로 jungjongho를 teacher로 쓰도록 설정돼 있는지, 그리고 "답변 1개=벡터 1개=점수 1개" 단위로 큐를 거치지 않고 동기적으로 BE에 바로 반환되는지 Claude Code로 검증 요청 예정(검증 전용 프롬프트 이미 작성해 전달함, 결과 리포트 기다리는 중). 1차 리포트에서 "jungjongho가 설정 안 되어있다"는 결과가 나온 상태 — 이게 (a) 코드/설정값 문제인지 (b) 단순히 아직 실행 안 해봐서 로컬 HF 캐시에 없는 상태인지 구분 필요.
3. pseudo-label 검수 방식: jungjongho가 우리 오디오 파일들에 매긴 confidence/tension_score CSV를 그대로 다 믿지 않고, 사람이 검수해서 명백히 이상한 행만 직접 수정하거나 우리 gold 라벨을 같은 스키마로 섞어넣는 방식으로 보정하기로 함. 단, `build_dataset.py`가 pseudo-label을 재생성할 때 사람이 고친 값을 덮어쓰지 않도록 하는 병합 로직이 있는지는 미확인 — 다음 검증 항목 후보.
4. sanity check 방법: 1301개 전체를 사람이 들을 필요 없음(애초에 jungjongho를 쓰는 이유 자체가 이를 피하기 위함, pseudo-label은 자동 생성됨). 대신 (a) 팀원들이 "편하게 말한 답변"과 "긴장하며 말한 답변"을 각각 녹음해 본인이 정답을 이미 아는 데이터로 방향성만 확인하거나, (b) jungjongho tension_score 기준 정렬 후 상위/하위/중간 각 10~15개(총 30~40개)만 표본 추출해 극단값 위주로 확인하는 방식으로 소규모 검증 진행. 1301개 전체 재라벨링은 팀 분담이 필요한 별도의 나중 단계 작업으로 분리해둠.
5. 최종 출력 형태 — A안 채택. "자신감 있음/없음" 이진 라벨이 필요하다는 요구가 나왔으나, 모델 학습 자체를 이진분류로 바꾸는 대신(B안, 스키마까지 변경 필요) 연속 confidence_score는 그대로 유지하고 표시 단계에서만 임계값으로 이진 라벨을 붙이는 방식(A안) 으로 결정. 학습 코드/API 스키마 변경 없음. 구현 방향:
   * `predictor.py`에서 confidence_score 계산 직후 라벨 필드(`confidence_label: "high"/"low"` 등) 하나만 추가해 ai-evaluate 응답에 포함시키는 안을 추천(BE/FE가 임계값 로직을 몰라도 되게 분리)
   * 임계값은 임의로 0.5 잡지 않고, sanity check 30~40개 표본에서 "편한" 그룹과 "긴장한" 그룹 점수 분포가 갈리는 지점을 보고 결정
   * 나중에 gold 데이터가 쌓이면 임계값 숫자만 조정하면 되고 재학습 불필요 — 이게 A안의 핵심 이점
   * `docs/SPRING_INTEGRATION.md` Java DTO에 라벨 필드 추가 필요

4. 다음에 이어서 할 만한 것 (미결)

* [ ] Claude Code 검증 리포트 확인 → jungjongho 미설정 원인이 코드 문제인지 캐시 문제인지 확정
* [ ] `build_dataset.py`가 사람이 수정한 pseudo-label 값을 덮어쓰지 않는지 확인
* [ ] sanity check 30~40개 샘플 추출 스크립트 작성 (jungjongho tension_score 기준 정렬 후 상/중/하 표본 추출) — 아직 미작성
* [ ] sanity check 결과 기반 confidence_label 임계값 확정 + predictor.py/SPRING_INTEGRATION.md 반영
* [ ] jungjongho TENSION_WEIGHTS, EMO-AffectNet FACE_TENSION_WEIGHTS 실데이터 sanity check
* [ ] 팀 자체 모의면접 영상 촬영+라벨링(gold 데이터, 아직 미착수)
* [ ] AIHub 채용면접 음성 1301개 재라벨링 — 전체가 아니라 팀 분담으로 일부만 우선 진행 검토
* [ ] ai-evaluate.zip 실제 프로젝트 폴더(S15P11D202) 반영 여부 결정
