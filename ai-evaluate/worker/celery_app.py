"""
Celery 애플리케이션 정의.

[Celery 는 Django 전용이 아니다]
프레임워크와 무관한 독립 분산 작업큐 라이브러리다. Django 예제가 많아 오해하기 쉽지만
FastAPI + Celery + Redis 조합으로 충분하며 Django 를 도입할 필요가 전혀 없다.

[이제 음성 전용이다]
표정 분석이 프론트 추출 + 서버 집계 구조로 바뀌면서 수 밀리초로 끝나게 되어
큐를 거치지 않는다. 이 워커는 librosa/Praat 연산이 필요한 음성만 처리한다.
"""
from celery import Celery

from config import settings

celery_app = Celery(
    "ai_evaluate",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    # 워커 기동 시 import 할 태스크 모듈 목록.
    include=["worker.tasks"],
)

celery_app.conf.update(
    # ── 직렬화 ──
    # 기본값 pickle 은 임의 객체를 역직렬화하며 코드 실행이 가능해 보안상 위험하다.
    # 우리는 dict/float 만 주고받으므로 json 으로 제한한다.
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],

    # ── 상태 추적 ──
    # 기본적으로 Celery 는 STARTED 를 기록하지 않는다(PENDING -> SUCCESS 로 점프).
    # BE 가 '대기중'과 '처리중'을 구분해 보여주려면 이 옵션이 필요하다.
    task_track_started=True,

    # ── 결과 만료 ──
    # BE 가 폴링해 가져간 뒤 자기 DB 에 저장하는 구조이므로 1시간이면 충분하다.
    # 영구 보관하면 Redis 메모리가 계속 증가한다.
    result_expires=3600,

    # ── 안정성 ──
    # acks_late : 작업을 '완료한 뒤에' 큐에서 지운다. 워커가 처리 중 죽어도(OOM, 배포 등)
    #             작업이 유실되지 않는다. 음성 분석은 멱등(같은 파일->같은 결과)이라
    #             재실행이 안전하므로 켜도 문제없다.
    # prefetch=1 : 워커가 미리 선점하는 작업 수. 기본값(4)이면 한 워커가 4개를 쥐고
    #              죽었을 때 한꺼번에 재실행된다. acks_late 와 반드시 짝으로 쓴다.
    task_acks_late=True,
    worker_prefetch_multiplier=1,

    # 손상된 오디오 등으로 라이브러리가 멈추는 상황 대비.
    # soft : 파이썬 예외를 던져 파일 정리 등 뒷처리 기회를 준다.
    # hard : 그래도 안 끝나면 프로세스를 강제 종료한다(C 레벨에서 멈춘 경우 대비).
    task_soft_time_limit=180,
    task_time_limit=240,

    timezone="Asia/Seoul",
)
