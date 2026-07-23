declare global {
  interface AitSpeechRecognitionAlternative {
    transcript: string
    confidence: number
  }

  interface AitSpeechRecognitionResult {
    readonly isFinal: boolean
    readonly length: number
    readonly [index: number]: AitSpeechRecognitionAlternative
  }

  interface AitSpeechRecognitionResultList {
    readonly length: number
    readonly [index: number]: AitSpeechRecognitionResult
  }

  interface AitSpeechRecognitionEvent extends Event {
    readonly resultIndex: number
    readonly results: AitSpeechRecognitionResultList
  }

  interface AitSpeechRecognitionErrorEvent extends Event {
    readonly error: string
    readonly message: string
  }

  interface AitSpeechRecognition {
    continuous: boolean
    interimResults: boolean
    lang: string
    onresult: ((event: AitSpeechRecognitionEvent) => void) | null
    onerror: ((event: AitSpeechRecognitionErrorEvent) => void) | null
    onend: (() => void) | null
    start(): void
    stop(): void
    abort(): void
  }

  interface AitSpeechRecognitionConstructor {
    new (): AitSpeechRecognition
  }

  interface Window {
    SpeechRecognition?: AitSpeechRecognitionConstructor
    webkitSpeechRecognition?: AitSpeechRecognitionConstructor
  }
}

export {}
