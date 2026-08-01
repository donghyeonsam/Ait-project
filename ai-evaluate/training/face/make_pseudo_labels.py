"""
[표정 학습 0단계] teacher(EMO-AffectNet)로 pseudo-label 생성

음성 쪽(training/voice/make_pseudo_labels.py)과 정확히 같은 목적이다: 사람이 일일이
라벨링하지 않고 무거운 사전학습 모델의 출력을 정답(label_final)으로 삼는다.

⚠️ 이 스크립트만 ResNet50(VGGFace2->AffectNet 파인튜닝) + LSTM 을 로드한다.
   서빙 서버에는 절대 올라가지 않는다 - core/face/ 의 115차원 집계벡터 + 경량 MLP
   가 서빙을 담당하고, 이 스크립트가 만든 값은 그 MLP 를 학습시키는 라벨로만 쓰인다.

[모델 출처]
  https://huggingface.co/ElenaRyumina/face_emotion_recognition (MIT License)
  논문: Ryumina et al., "In Search of a Robust Facial Expressions Recognition Model:
  A Large-Scale Visual Cross-Corpus Study", Neurocomputing 2022.
  가중치 파일(state_dict, .pt)을 huggingface_hub 로 직접 받는다 - Google Drive 수동
  다운로드가 필요 없다(README 에 적힌 방법과 달리 HF repo 에 실제 파일이 올라와 있다).

  ResNet50/LSTMPyTorch 클래스 정의와 전처리(pth_processing)는 저장소가 공개한
  run_webcam.ipynb 의 코드를 그대로 옮긴 것이다(MIT 라이선스 하에 재사용 가능).
  TorchScript export 가 아니라 순수 state_dict 라서, 이 클래스 정의가 정확히
  일치해야만 가중치가 로드된다 - 임의로 구조를 바꾸면 안 된다.

[LSTM 은 코퍼스별로 6종이다]
  Aff-Wild2/CREMA-D/IEMOCAP/RAMAS/RAVDESS/SAVEE 각각으로 leave-one-corpus-out
  학습된 버전이 따로 있다. 전부 연기(acted) 데이터거나 유튜브 반응 영상(Aff-Wild2)
  이라 우리 실제 면접 도메인과는 다르다 - 그 중 Aff-Wild2 가 그나마 "자연스러운
  반응"에 가까워 기본값으로 쓴다. --lstm-corpus 로 바꿀 수 있다.

[프레임 추출/얼굴 크롭]
  RetinaFace(원 저장소가 쓰는 얼굴 검출기)는 GPU 의존적인 별도 패키지(batch_face)가
  필요해, 이미 training 의존성에 있는 MediaPipe FaceMesh 로 대체했다(정확도 손실은
  제한적이고 CPU 에서 가볍다). 원본과 동일하게 얼굴 랜드마크의 min/max 좌표를 그대로
  바운딩박스로 쓴다(패딩 없음 - 원본 get_box() 그대로).

[GPU 사용 - CUDA / MPS 둘 다 지원]
  음성 쪽(training/voice/make_pseudo_labels.py)과 같은 --device 패턴이다. 생략하면
  CUDA(NVIDIA) -> MPS(애플 실리콘) -> CPU 순으로 자동 선택한다.
  ⚠️ MediaPipe 얼굴 검출은 GPU 와 무관하게 항상 CPU 에서 돈다. 따라서 --device 로
     빨라지는 건 ResNet50 임베딩 추출 구간뿐이고, 전체 시간은 얼굴 검출이 지배할 수
     있다. 어느 쪽이 병목인지는 소량으로 먼저 재보는 것을 권한다.

[person_id]
  파일명에서 자동으로 추정한다(infer_person_id 참고). FI-V2 는
  "{유튜브ID}.{클립번호}.mp4" 형식이라 유튜브ID 를, 팀 자체 촬영본은
  "{본인번호}_{그룹}_{순번}.mp4" 형식이라 본인번호를 person_id 로 쓴다.
  train_mlp.py 의 --group-split 이 이 값을 기준으로 사람 단위 분리를 한다.

실행:
  pip install -r requirements.txt -r requirements-train.txt

  python -m training.face.make_pseudo_labels \
      --video data/raw/video --out training/face/labels_pseudo.csv \
      --lstm-corpus Aff-Wild2

  # GPU 를 명시하거나(자동 감지가 잘못 골랐을 때), 배치 크기를 조절하려면:
  python -m training.face.make_pseudo_labels \
      --video data/raw/video --out training/face/labels_pseudo.csv \
      --device cuda --batch-size 64

  # 사람이 이미 매긴 labels.csv 와 합쳐 쓰려면 파일을 분리해서 관리하고,
  # build_dataset.py 는 --labels 로 원하는 CSV 를 골라 실행하면 된다.

⚠️ sanity check 필수: 아래에서 나온 label_final 중 몇 개를 실제 영상과 비교해보고
   납득 가능한지 확인할 것. 이 teacher 는 한국인 면접 영상으로 검증된 적이 없다.

[2026-08-01 sanity check 결과 - FACE_TENSION_WEIGHTS Fear 1.0 -> 0.5 로 조정]
  Fear top 클립(전체 2,000개 중 87개, 4.4%) 5개를 실제 영상으로 확인한 결과,
  대부분 실제로 불안해 보이지 않고 "그냥 눈을 크게 뜨고 말하는" 표현 스타일이었다.
  실제 EAR(눈 개폐 비율) 평균도 이 5개 클립이 0.53~0.71로 전체 200개 샘플 평균(0.48)
  보다 뚜렷이 높아, teacher 가 진짜 공포가 아니라 "눈 크기"라는 얕은 시각 단서에
  반응했다는 정황이 수치로도 확인됨. Fear/Surprise 는 눈 크게 뜨기 Action Unit을
  공유해 FER 모델이 흔히 혼동하는 조합이기도 하다. Fear 가 87개뿐인데 가중치가
  제일 높아(1.0) tension 분포의 "높은 쪽 꼬리"를 사실상 이 오분류가 만들고 있었다.
  Disgust(0.5)와 같은 수준으로 낮춰 재실험한다 - 근본 해결(teacher 교체/실라벨
  확보)은 아니지만, 지금 확인된 가장 값싼 개선점이다.
"""
from __future__ import annotations

import argparse
import csv
import math
from pathlib import Path

import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image

REPO_ID = "ElenaRyumina/face_emotion_recognition"
BACKBONE_FILE = "FER_static_ResNet50_AffectNet.pt"
LSTM_CORPORA = ["Aff-Wild2", "CREMA-D", "IEMOCAP", "RAMAS", "RAVDESS", "SAVEE"]

# EMO-AffectNet 이 예측하는 7클래스. 인덱스 순서가 fc 출력 순서와 정확히 같아야 한다.
DICT_EMO = {0: "Neutral", 1: "Happiness", 2: "Sadness", 3: "Surprise",
            4: "Fear", 5: "Disgust", 6: "Anger"}

# 7클래스를 "자신감/긴장도" 스칼라로 재조합하는 가중치.
# jungjongho(음성) 쪽 TENSION_WEIGHTS 와 같은 성격의 순수 휴리스틱이다.
# Sadness/Disgust 를 중간, Surprise/Anger 를 약하게 잡았다 - 면접 맥락에서 "놀람"은
# 어려운 질문에 대한 자연스러운 반응일 수 있고 "분노"는 표정 오검출(찡그림 등)과
# 헷갈리기 쉬워 가중치를 낮췄다.
# [2026-08-01] Fear 를 1.0 -> 0.5 로 낮춤. sanity check 결과 Fear top 클립들이
# 실제로는 "눈을 크게 뜬" 표현 스타일이었고 EAR 수치도 뒷받침함(위 docstring 참고).
# Fear/Surprise 가 눈 크게 뜨기 Action Unit을 공유해 혼동하기 쉬운 걸 감안해
# Disgust 와 같은 수준으로 낮췄다.
# ⚠️ 반드시 우리 실제 면접 녹화로 재조정할 값이다 - 이 조정도 여전히 휴리스틱이다.
FACE_TENSION_WEIGHTS = {
    "Neutral": 0.0,
    "Happiness": 0.0,
    "Sadness": 0.6,
    "Surprise": 0.3,
    "Fear": 0.5,
    "Disgust": 0.5,
    "Anger": 0.4,
}

WINDOW = 10   # LSTM 입력 시퀀스 길이. 원 저장소 run.py 의 win=10 을 그대로 따른다.
STEP = 5      # 슬라이딩 스텝. 마찬가지로 원 저장소 값을 따른다.

# ResNet50 에 한 번에 넣을 프레임 수. CPU 에서는 큰 의미가 없지만 GPU 에서는
# 한 장씩 보내면 커널 실행 오버헤드가 연산보다 커져 GPU 를 거의 못 쓴다.
DEFAULT_BATCH_SIZE = 32


def resolve_device(explicit: str | None) -> "torch.device":
    """--device 인자 -> torch.device. 생략 시 CUDA -> MPS -> CPU 순으로 고른다.

    MPS(애플 실리콘)를 CUDA 다음에 두는 이유는 단순히 우선순위이며, 두 환경이
    동시에 존재하는 경우는 없다. torch.backends.mps 는 구버전 torch 에 없을 수
    있어 getattr 로 방어한다.
    """
    if explicit:
        return torch.device(explicit)
    if torch.cuda.is_available():
        return torch.device("cuda")
    mps = getattr(torch.backends, "mps", None)
    if mps is not None and mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


# ────────────────────────── 모델 정의 (원 저장소 run_webcam.ipynb 그대로) ──────────────────────────
# 구조를 바꾸면 state_dict 가 로드되지 않는다 - 이름/모양이 정확히 일치해야 한다.

class Bottleneck(nn.Module):
    expansion = 4

    def __init__(self, in_channels, out_channels, i_downsample=None, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride,
                                padding=0, bias=False)
        self.batch_norm1 = nn.BatchNorm2d(out_channels, eps=0.001, momentum=0.99)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, padding="same",
                                bias=False)
        self.batch_norm2 = nn.BatchNorm2d(out_channels, eps=0.001, momentum=0.99)
        self.conv3 = nn.Conv2d(out_channels, out_channels * self.expansion, kernel_size=1,
                                stride=1, padding=0, bias=False)
        self.batch_norm3 = nn.BatchNorm2d(out_channels * self.expansion, eps=0.001, momentum=0.99)
        self.i_downsample = i_downsample
        self.stride = stride
        self.relu = nn.ReLU()

    def forward(self, x):
        identity = x.clone()
        x = self.relu(self.batch_norm1(self.conv1(x)))
        x = self.relu(self.batch_norm2(self.conv2(x)))
        x = self.conv3(x)
        x = self.batch_norm3(x)
        if self.i_downsample is not None:
            identity = self.i_downsample(identity)
        x += identity
        return self.relu(x)


class Conv2dSame(nn.Conv2d):
    """TensorFlow 의 padding='same' 을 파이토치에서 재현한다(케라스 원본과 동일한
    출력 크기를 맞추기 위함 - 일반 파이토치 padding 정수값으로는 재현되지 않는다)."""

    def calc_same_pad(self, i: int, k: int, s: int, d: int) -> int:
        return max((math.ceil(i / s) - 1) * s + (k - 1) * d + 1 - i, 0)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        ih, iw = x.size()[-2:]
        pad_h = self.calc_same_pad(ih, self.kernel_size[0], self.stride[0], self.dilation[0])
        pad_w = self.calc_same_pad(iw, self.kernel_size[1], self.stride[1], self.dilation[1])
        if pad_h > 0 or pad_w > 0:
            x = F.pad(x, [pad_w // 2, pad_w - pad_w // 2, pad_h // 2, pad_h - pad_h // 2])
        return F.conv2d(x, self.weight, self.bias, self.stride, self.padding,
                         self.dilation, self.groups)


class ResNet(nn.Module):
    def __init__(self, block, layer_list, num_classes, num_channels=3):
        super().__init__()
        self.in_channels = 64
        self.conv_layer_s2_same = Conv2dSame(num_channels, 64, 7, stride=2, groups=1, bias=False)
        self.batch_norm1 = nn.BatchNorm2d(64, eps=0.001, momentum=0.99)
        self.relu = nn.ReLU()
        self.max_pool = nn.MaxPool2d(kernel_size=3, stride=2)
        self.layer1 = self._make_layer(block, layer_list[0], planes=64, stride=1)
        self.layer2 = self._make_layer(block, layer_list[1], planes=128, stride=2)
        self.layer3 = self._make_layer(block, layer_list[2], planes=256, stride=2)
        self.layer4 = self._make_layer(block, layer_list[3], planes=512, stride=2)
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc1 = nn.Linear(512 * block.expansion, 512)
        self.relu1 = nn.ReLU()
        self.fc2 = nn.Linear(512, num_classes)

    def extract_features(self, x):
        """backbone 의 512차원 임베딩. LSTM 입력으로 쓰이는 것이 바로 이 값이다
        (분류 헤드 fc2 는 backbone 단독 정확도 확인용일 뿐, distillation 에는 안 씀)."""
        x = self.relu(self.batch_norm1(self.conv_layer_s2_same(x)))
        x = self.max_pool(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        x = self.avgpool(x)
        x = x.reshape(x.shape[0], -1)
        return self.fc1(x)

    def forward(self, x):
        x = self.extract_features(x)
        x = self.relu1(x)
        return self.fc2(x)

    def _make_layer(self, block, blocks, planes, stride=1):
        downsample = None
        if stride != 1 or self.in_channels != planes * block.expansion:
            downsample = nn.Sequential(
                nn.Conv2d(self.in_channels, planes * block.expansion, kernel_size=1,
                          stride=stride, bias=False, padding=0),
                nn.BatchNorm2d(planes * block.expansion, eps=0.001, momentum=0.99),
            )
        layers = [block(self.in_channels, planes, i_downsample=downsample, stride=stride)]
        self.in_channels = planes * block.expansion
        for _ in range(blocks - 1):
            layers.append(block(self.in_channels, planes))
        return nn.Sequential(*layers)


def resnet50(num_classes, channels=3):
    return ResNet(Bottleneck, [3, 4, 6, 3], num_classes, channels)


class LSTMPyTorch(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm1 = nn.LSTM(input_size=512, hidden_size=512, batch_first=True, bidirectional=False)
        self.lstm2 = nn.LSTM(input_size=512, hidden_size=256, batch_first=True, bidirectional=False)
        self.fc = nn.Linear(256, 7)
        self.softmax = nn.Softmax(dim=1)

    def forward(self, x):
        x, _ = self.lstm1(x)
        x, _ = self.lstm2(x)
        x = self.fc(x[:, -1, :])
        return self.softmax(x)


# ────────────────────────── 전처리 / 얼굴 검출 ──────────────────────────

def preprocess_face(face_rgb: np.ndarray) -> torch.Tensor:
    """크롭된 얼굴(RGB, HWC, uint8) -> 모델 입력 텐서 (1,3,224,224).

    원본 pth_processing 과 동치: PIL 로 224x224 NEAREST 리사이즈 -> CHW 텐서 ->
    채널 순서를 RGB->BGR 로 뒤집고 -> VGGFace2 버전2 평균값을 뺀다.
    (torchvision 의존을 피하려고 PILToTensor 대신 numpy 로 직접 구현했다 - 결과는 같다.)
    """
    img = Image.fromarray(face_rgb).resize((224, 224), Image.Resampling.NEAREST)
    arr = np.asarray(img, dtype=np.float32).transpose(2, 0, 1)  # HWC -> CHW, 여전히 RGB
    tensor = torch.from_numpy(arr)
    tensor = torch.flip(tensor, dims=(0,))  # RGB -> BGR (채널 축 뒤집기)
    tensor[0] -= 91.4953
    tensor[1] -= 103.8827
    tensor[2] -= 131.0912
    return tensor.unsqueeze(0)


def face_bbox_from_landmarks(landmarks, w: int, h: int):
    """MediaPipe FaceMesh 랜드마크(468개) -> (startX, startY, endX, endY).
    원본 get_box() 와 동일하게 패딩 없이 min/max 좌표를 그대로 쓴다."""
    xs = np.array([lm.x for lm in landmarks.landmark])
    ys = np.array([lm.y for lm in landmarks.landmark])
    x_min = int(np.clip(np.floor(xs.min() * w), 0, w - 1))
    y_min = int(np.clip(np.floor(ys.min() * h), 0, h - 1))
    x_max = int(np.clip(np.floor(xs.max() * w), 0, w - 1))
    y_max = int(np.clip(np.floor(ys.max() * h), 0, h - 1))
    return x_min, y_min, x_max, y_max


def _embed_batch(tensors: list[torch.Tensor], backbone, device) -> list[np.ndarray]:
    """전처리된 얼굴 텐서 묶음 -> 512차원 임베딩 리스트.

    한 장씩 처리하지 않고 묶어서 보내는 이유: GPU 는 커널 하나를 띄우는 고정 비용이
    있어서, 224x224 한 장씩 보내면 그 오버헤드가 실제 연산보다 커진다. CPU 에서는
    큰 차이가 없지만 손해도 없다.
    """
    if not tensors:
        return []
    batch = torch.cat(tensors, dim=0).to(device)
    with torch.no_grad():
        feats = F.relu(backbone.extract_features(batch))
    # .cpu() 필수: device 가 cuda/mps 면 numpy() 를 바로 호출할 수 없다.
    return list(feats.cpu().numpy())


def extract_clip_features(video_path: str, backbone, face_mesh, device,
                          target_fps: float = 5.0,
                          batch_size: int = DEFAULT_BATCH_SIZE):
    """영상 1개 -> (n_frames, 512) backbone 임베딩 시퀀스."""
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    step = max(1, round(fps / target_fps))

    features: list[np.ndarray] = []
    pending: list[torch.Tensor] = []   # 아직 모델에 안 넣은 얼굴 텐서 버퍼
    idx = 0
    while True:
        ok, frame_bgr = cap.read()
        if not ok:
            break
        idx += 1
        if idx % step != 0:
            continue

        h, w = frame_bgr.shape[:2]
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        # ⚠️ MediaPipe 는 GPU 와 무관하게 CPU 에서 돈다(--device 의 영향을 받지 않음).
        result = face_mesh.process(frame_rgb)
        if not result.multi_face_landmarks:
            continue

        x0, y0, x1, y1 = face_bbox_from_landmarks(result.multi_face_landmarks[0], w, h)
        if x1 <= x0 or y1 <= y0:
            continue
        face_crop = frame_rgb[y0:y1, x0:x1]

        pending.append(preprocess_face(face_crop))
        if len(pending) >= batch_size:
            features.extend(_embed_batch(pending, backbone, device))
            pending.clear()

    # 마지막 자투리 배치. 이걸 빠뜨리면 클립 끝부분 프레임이 조용히 사라진다.
    features.extend(_embed_batch(pending, backbone, device))

    cap.release()
    return np.stack(features) if features else np.empty((0, 512), dtype=np.float32)


def predict_clip_emotion_probs(features: np.ndarray, lstm_model, device) -> np.ndarray:
    """(n_frames, 512) -> 클립 전체를 대표하는 7클래스 평균 확률.

    run.py(원 저장소)의 win=10/step=5 슬라이딩 윈도우 방식을 그대로 따르되,
    실시간 스트리밍이 아니라 오프라인이므로 윈도우별 예측을 전부 평균낸다.
    """
    n = len(features)
    if n == 0:
        raise ValueError("얼굴이 검출된 프레임이 없습니다.")

    if n < WINDOW:
        # 클립이 너무 짧으면(WINDOW 미만) 마지막 프레임을 복제해 하나의 윈도우로 채운다.
        pad = np.tile(features[-1:], (WINDOW - n, 1))
        features = np.concatenate([features, pad], axis=0)
        n = WINDOW

    # 윈도우들을 한꺼번에 쌓아 LSTM 에 한 번만 통과시킨다.
    # (윈도우 하나하나가 (10, 512) 로 작아서, 개별 호출하면 오버헤드가 지배적이다)
    chunks = [features[s:s + WINDOW] for s in range(0, n - WINDOW + 1, STEP)]
    x = torch.from_numpy(np.stack(chunks)).float().to(device)
    with torch.no_grad():
        probs = lstm_model(x)          # (윈도우 수, 7)

    return probs.cpu().numpy().mean(axis=0)


def infer_person_id(stem: str) -> str:
    """파일명(확장자 제외) -> person_id 추정.

    train/val 을 사람 단위로 분리(--group-split)하려면 person_id 가 필요한데,
    지금까지는 전부 "unknown" 으로 채워 데이터 누수(같은 사람이 train/val 양쪽에
    섞임) 위험이 있었다. 두 가지 파일명 규칙을 지원한다.

    - FI-V2: "{유튜브ID}.{클립번호}.mp4" -> stem 에 '.' 이 남아 있으므로
      마지막 '.' 앞부분(유튜브ID)을 person_id 로 쓴다.
    - 팀 자체 촬영본: "{본인번호}_{그룹}_{순번}.mp4" -> stem 에 '.' 이 없고
      '_' 로 구분되므로 첫 '_' 앞부분(본인번호)을 person_id 로 쓴다.
    - 둘 다 아니면 stem 전체를 person_id 로 쓴다(그룹 분리는 못 하지만
      전부 "unknown"으로 뭉쳐 누수가 나는 것보다는 낫다).
    """
    if "." in stem:
        return stem.rsplit(".", 1)[0]
    if "_" in stem:
        return stem.split("_", 1)[0]
    return stem


def load_models(lstm_corpus: str, device):
    """가중치를 받아 두 모델을 복원하고 지정한 device 로 올린다.

    가중치 파일 자체는 항상 CPU 로 읽는다(map_location="cpu"). 저장 당시의 device
    정보가 체크포인트에 남아 있을 수 있어, 이를 무시하고 우리가 원하는 device 로
    .to() 하는 편이 안전하다.
    """
    from huggingface_hub import hf_hub_download

    backbone_path = hf_hub_download(REPO_ID, BACKBONE_FILE)
    lstm_path = hf_hub_download(REPO_ID, f"FER_dinamic_LSTM_{lstm_corpus}.pt")

    backbone = resnet50(7, channels=3)
    backbone.load_state_dict(torch.load(backbone_path, map_location="cpu", weights_only=True))
    backbone.eval().to(device)

    lstm_model = LSTMPyTorch()
    lstm_model.load_state_dict(torch.load(lstm_path, map_location="cpu", weights_only=True))
    lstm_model.eval().to(device)

    return backbone, lstm_model


def main():
    import mediapipe as mp

    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True, help="영상 폴더")
    parser.add_argument("--out", required=True, help="출력 csv (labels.csv 와 동일한 스키마)")
    parser.add_argument("--lstm-corpus", choices=LSTM_CORPORA, default="Aff-Wild2",
                        help="6개 LSTM 버전 중 하나. Aff-Wild2 가 그나마 자연스러운 반응이라 기본값")
    parser.add_argument("--sample-fps", type=float, default=5.0,
                        help="초당 몇 프레임을 볼지 (표정 브라우저 추출과 동일하게 5 권장)")
    parser.add_argument("--device", default=None,
                        help='"cuda"/"mps"/"cpu" 직접 지정. 생략하면 '
                             "CUDA -> MPS -> CPU 순으로 자동 선택")
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE,
                        help="ResNet50 에 한 번에 넣을 프레임 수 (GPU 메모리가 부족하면 줄일 것)")
    args = parser.parse_args()

    device = resolve_device(args.device)
    print(f"[device] {device} 사용 (torch {torch.__version__}, batch={args.batch_size})")
    if device.type == "cpu":
        print("  ⚠️ GPU 를 못 찾아 CPU 로 돕니다. 클립이 많으면 오래 걸릴 수 있습니다.")

    backbone, lstm_model = load_models(args.lstm_corpus, device)

    video_files = sorted(
        p for p in Path(args.video).iterdir()
        if p.suffix.lower() in {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    )
    if not video_files:
        raise SystemExit(f"영상이 없습니다: {args.video}")

    rows = []
    with mp.solutions.face_mesh.FaceMesh(
        max_num_faces=1, refine_landmarks=False,
        min_detection_confidence=0.5, min_tracking_confidence=0.5,
    ) as face_mesh:
        for path in video_files:
            try:
                feats = extract_clip_features(
                    str(path), backbone, face_mesh, device,
                    target_fps=args.sample_fps, batch_size=args.batch_size)
                probs = predict_clip_emotion_probs(feats, lstm_model, device)
            except ValueError as e:
                print(f"[skip] {path.name}: {e}")
                continue

            label_probs = {DICT_EMO[i]: float(p) for i, p in enumerate(probs)}
            tension = sum(label_probs[k] * w for k, w in FACE_TENSION_WEIGHTS.items())
            tension = float(np.clip(tension, 0.0, 1.0))
            confidence = round(1.0 - tension, 4)

            top = max(label_probs, key=label_probs.get)
            rows.append({
                "clip_id": path.stem,
                "file_name": path.name,
                "person_id": infer_person_id(path.stem),
                "labeler_a": "",
                "labeler_b": "",
                "label_final": confidence,
                "note": f"EMO-AffectNet pseudo-label (teacher={args.lstm_corpus}, "
                        f"top={top} {label_probs[top]:.2f}, tension={tension:.3f}) - 사람 검수 전",
            })
            print(f"[ok] {path.name} top={top}({label_probs[top]:.2f}) "
                  f"confidence={confidence:.3f} tension={tension:.3f} "
                  f"person_id={rows[-1]['person_id']}")

    if not rows:
        raise SystemExit("생성된 라벨이 없습니다(모든 영상에서 얼굴 검출 실패).")

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    fieldnames = ["clip_id", "file_name", "person_id", "labeler_a", "labeler_b",
                  "label_final", "note"]
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n저장: {args.out} ({len(rows)}개)")
    print(
        "\n⚠️ sanity check 필수: 위 결과 중 몇 개를 실제 영상과 비교해보고 납득 가능한지"
        " 확인하세요.\n   이 teacher(EMO-AffectNet)는 연기 발화 코퍼스(RAVDESS 등)와"
        " 유튜브 반응 영상(Aff-Wild2)으로 학습됐고,\n   한국인 면접 영상으로는 검증된 적이"
        " 없습니다. FACE_TENSION_WEIGHTS 매핑도 순수 휴리스틱이라 이 스크립트 상단"
        " 가중치를\n   우리 데이터로 직접 검증/조정해야 합니다."
    )


if __name__ == "__main__":
    main()
