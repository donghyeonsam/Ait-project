from __future__ import annotations

from array import array
from math import sqrt
from pathlib import Path
import sys
import wave


SAMPLE_RATE = 24_000
SAMPLE_WIDTH = 2
WINDOW_MS = 20
WINDOW_SAMPLES = SAMPLE_RATE * WINDOW_MS // 1_000
MIN_GAP_SECONDS = 0.22
PADDING_SECONDS = 0.15


def window_rms(samples: array) -> list[float]:
    energies: list[float] = []
    for start in range(0, len(samples), WINDOW_SAMPLES):
        chunk = samples[start : start + WINDOW_SAMPLES]
        if not chunk:
            break
        energies.append(sqrt(sum(value * value for value in chunk) / len(chunk)))
    return energies


def find_silence_runs(
    energies: list[float], threshold: float
) -> list[tuple[int, int]]:
    runs: list[tuple[int, int]] = []
    start: int | None = None

    for index, energy in enumerate(energies):
        if energy <= threshold:
            if start is None:
                start = index
        elif start is not None:
            runs.append((start, index))
            start = None

    if start is not None:
        runs.append((start, len(energies)))

    minimum_windows = int(MIN_GAP_SECONDS * 1_000 / WINDOW_MS)
    return [run for run in runs if run[1] - run[0] >= minimum_windows]


def write_wav(path: Path, samples: array) -> None:
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(SAMPLE_WIDTH)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(samples.tobytes())


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: split_demo_tts.py <input.pcm> <output-directory>")

    input_path = Path(sys.argv[1]).resolve()
    output_directory = Path(sys.argv[2]).resolve()
    output_directory.mkdir(parents=True, exist_ok=True)

    samples = array("h")
    samples.frombytes(input_path.read_bytes())
    if sys.byteorder != "little":
        samples.byteswap()

    energies = window_rms(samples)
    sorted_energies = sorted(energies)
    peak_reference = sorted_energies[int(len(sorted_energies) * 0.95)]
    threshold = max(120.0, peak_reference * 0.025)
    runs = find_silence_runs(energies, threshold)

    # 시작·끝 무음은 제외하고 가장 긴 두 구간을 질문 사이의 경계로 사용한다.
    interior_runs = [
        run
        for run in runs
        if run[0] * WINDOW_SAMPLES > SAMPLE_RATE // 2
        and run[1] * WINDOW_SAMPLES < len(samples) - SAMPLE_RATE // 2
    ]
    selected_runs = sorted(
        interior_runs,
        key=lambda run: run[1] - run[0],
        reverse=True,
    )[:2]
    if len(selected_runs) != 2:
        durations = [round((end - start) * WINDOW_MS / 1_000, 2) for start, end in runs]
        raise RuntimeError(f"질문 경계 무음 2개를 찾지 못했습니다: {durations}")

    selected_runs.sort()
    padding = int(PADDING_SECONDS * SAMPLE_RATE)
    first_gap = (
        selected_runs[0][0] * WINDOW_SAMPLES,
        selected_runs[0][1] * WINDOW_SAMPLES,
    )
    second_gap = (
        selected_runs[1][0] * WINDOW_SAMPLES,
        selected_runs[1][1] * WINDOW_SAMPLES,
    )

    segments = [
        samples[: min(len(samples), first_gap[0] + padding)],
        samples[max(0, first_gap[1] - padding) : min(len(samples), second_gap[0] + padding)],
        samples[max(0, second_gap[1] - padding) :],
    ]
    output_names = [
        "portfolio-question-1-single-take.wav",
        "portfolio-question-1-followup-single-take.wav",
        "portfolio-question-2-single-take.wav",
    ]

    for name, segment in zip(output_names, segments, strict=True):
        write_wav(output_directory / name, segment)

    gap_durations = [
        round((end - start) * WINDOW_MS / 1_000, 2)
        for start, end in selected_runs
    ]
    segment_durations = [round(len(segment) / SAMPLE_RATE, 2) for segment in segments]
    print(f"threshold={threshold:.2f}")
    print(f"gap_durations={gap_durations}")
    print(f"segment_durations={segment_durations}")


if __name__ == "__main__":
    main()
