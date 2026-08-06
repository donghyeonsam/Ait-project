import type { InterviewReportDetail } from '@/api/ai-interviews'

export interface RadarAxis {
  label: string
  score: number
}

// 리포트 상세 점수를 레이더 축 순서(시선→표정→목소리→질의응답→문장구성)로 배열한다.
export function toRadarAxes(detail: InterviewReportDetail): RadarAxis[] {
  return [
    { label: '시선', score: detail.eyeContactScore },
    { label: '표정', score: detail.faceScore },
    { label: '목소리', score: detail.voiceScore },
    { label: '질의응답', score: detail.qnaScore },
    { label: '문장구성', score: detail.sentenceScore },
  ]
}
