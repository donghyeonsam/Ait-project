"""
미디어 파일 저장 추상화.

[왜 이 계층이 필요한가 - 배포 위치가 아직 미정이기 때문]
api 와 worker 가 오디오 파일을 주고받는 방법은 배포 형태에 따라 달라진다.
  - 단일 VM + docker compose : 공유 볼륨(로컬 파일시스템)으로 충분
  - ECS/k8s/오토스케일링      : 두 컨테이너가 다른 노드에 뜰 수 있어 오브젝트 스토리지 필요
이 계층을 두면 배포 형태가 바뀌어도 api/tasks 코드는 한 줄도 바뀌지 않고,
.env 의 STORAGE_BACKEND 만 교체하면 된다.

S3 로 전환할 때 할 일:
  1) 아래에 S3Storage 클래스 추가
       save        -> boto3 upload_fileobj
       fetch_local -> /tmp 로 download_file 후 그 경로 반환
       delete      -> delete_object
  2) get_storage() 에 분기 한 줄 추가
"""
from __future__ import annotations

import shutil
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from config import settings


class Storage(ABC):
    @abstractmethod
    def save(self, fileobj, suffix: str, kind: str) -> str:
        """업로드 스트림을 저장하고 위치 식별자('키')를 반환한다."""

    @abstractmethod
    def fetch_local(self, key: str) -> str:
        """키를 worker 가 직접 열 수 있는 로컬 경로로 만들어 반환한다."""

    @abstractmethod
    def delete(self, key: str) -> None:
        """저장된 파일을 삭제한다."""


class LocalStorage(Storage):
    """공유 볼륨 방식. 키 = 파일 경로 그 자체."""

    def save(self, fileobj, suffix: str, kind: str) -> str:
        dest_dir = Path(settings.media_dir) / kind
        dest_dir.mkdir(parents=True, exist_ok=True)

        # 파일명을 uuid 로 새로 만드는 이유:
        #  1) 보안 - 사용자가 보낸 파일명에 "../../etc/passwd" 같은 경로 조작 문자열이
        #     들어있으면 의도치 않은 위치에 파일을 쓸 수 있다(path traversal).
        #  2) 충돌 방지 - 여러 사용자가 같은 이름을 올려도 덮어쓰지 않는다.
        dest = dest_dir / f"{uuid.uuid4().hex}{suffix}"

        # copyfileobj 는 length 크기만큼 끊어서 복사한다. 통째로 read() 하면
        # 파일 크기만큼 메모리에 올라가므로 동시 업로드 시 위험하다.
        with dest.open("wb") as out:
            shutil.copyfileobj(fileobj, out, length=1024 * 1024)
        return str(dest)

    def fetch_local(self, key: str) -> str:
        return key  # 이미 로컬 경로이므로 다운로드가 필요 없다

    def delete(self, key: str) -> None:
        Path(key).unlink(missing_ok=True)


def get_storage() -> Storage:
    if settings.storage_backend == "local":
        return LocalStorage()
    raise ValueError(
        f"미지원 스토리지 백엔드: {settings.storage_backend} "
        "(현재 'local' 만 구현됨. S3 가 필요하면 이 파일에 S3Storage 를 추가하세요)"
    )


storage = get_storage()
