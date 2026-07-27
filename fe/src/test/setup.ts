// Vitest 전역 설정. jest-dom 매처를 등록하고 각 테스트 후 렌더링을 정리한다.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
