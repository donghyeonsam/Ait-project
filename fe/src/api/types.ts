// 백엔드 공통 응답 봉투와 요청 옵션 타입. 실제 데이터는 data 필드에 담겨 온다.
export interface ApiResponse<T> {
  statusCode: number
  timestamp: string
  path: string
  message: string
  data: T
  error: unknown
}

export interface ApiRequestOptions extends RequestInit {
  authenticated?: boolean
}
