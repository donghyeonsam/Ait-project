FROM python:3.11-slim

RUN apt-get update && apt-get install -y ffmpeg libsm6 libxext6

WORKDIR /app

# ffmpeg : librosa 가 webm/m4a/mp3 등을 디코딩할 때 필요.
#          (표정 쪽 영상 디코딩이 사라져 libgl 등 OpenCV 의존 패키지는 더 이상 필요 없다)
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# torch 는 CPU 전용 인덱스에서 먼저 설치한다.
# 기본 PyPI 의 torch 는 CUDA 런타임까지 받아 이미지가 2GB 이상 커지는데,
# GPU 없는 EC2 에서는 쓸모가 없으므로 CPU 휠로 대체한다.
RUN pip install --no-cache-dir torch==2.4.1 \
        --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

# training/ 과 data/ 는 .dockerignore 로 제외된다.
# 학습 산출물(.pt, .json)만 core/*/model/ 에 커밋되어 이미지에 포함된다.
COPY config.py .
COPY api/ ./api/
COPY core/ ./core/
COPY worker/ ./worker/

RUN mkdir -p /app/media

EXPOSE 8100
