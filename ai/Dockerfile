FROM python:3.11-slim

# 컨테이너 안에서 작업할 폴더 지정
WORKDIR /app

# pip install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 나머지 프로젝트 파일을 전체 복사
COPY . .

EXPOSE 8000

# 컨테이너가 시작될 때 실행할 명령어들
# --reload -> 코드 수정하면 서버 자동 재시작(개발용, 배포시 빼는거 권장)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]