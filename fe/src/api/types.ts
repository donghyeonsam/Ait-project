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
