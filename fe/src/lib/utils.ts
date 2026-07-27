import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Tailwind 클래스들을 병합하되 충돌하는 유틸리티는 뒤 값으로 덮어써 정리한다.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
