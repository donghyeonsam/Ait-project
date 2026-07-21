FROM python:3.11-slim

WORKDIR /app

# 빌드 도구 (sentence-transformers / chromadb 네이티브 의존성 대비)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 임베딩 모델을 빌드 시점에 미리 캐시 (첫 요청 지연 방지)
ARG EMBEDDING_MODEL=jhgan/ko-sroberta-multitask
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('${EMBEDDING_MODEL}')"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
