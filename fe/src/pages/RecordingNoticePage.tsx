import { PageLayout } from '@/components/layout/PageLayout'
import { PolicyDocument } from '@/components/common/PolicyDocument'

const articles = [
  {
    heading: '안내 목적',
    paragraphs: [
      'Ait는 AI 모의면접과 화상 면접 스터디 과정에서 카메라·마이크를 사용하고, 답변 구간의 표정·시선 등 비언어적 요소를 분석에 활용합니다. 이 문서는 무엇이 캡처되고 어떻게 처리되는지 안내합니다.',
    ],
  },
  {
    heading: 'AI 모의면접에서 캡처하는 항목',
    items: [
      '음성 답변: 면접 질문에 대한 회원의 음성 및 텍스트 변환 결과',
      '비언어적 지표: 답변 녹음 구간 동안 브라우저에서 실시간으로 추출한 표정(blendshape), 눈·입 개폐 정도(EAR·MAR), 시선(홍채 중심 위치)',
    ],
  },
  {
    heading: '캡처 및 전송 방식',
    paragraphs: [
      '표정·시선 지표는 회원의 브라우저에서 MediaPipe 기반으로 프레임 단위로 추출한 뒤, 원본 영상이 아닌 수치화된 지표 값을 서버로 전송합니다.',
      '전송된 지표는 AI 분석 서버에서 면접 답변 평가에 활용되며, 그 외 목적으로 이용하지 않습니다.',
    ],
  },
  {
    heading: '화상 면접 스터디에서의 카메라·마이크 이용',
    paragraphs: [
      '화상 면접 스터디 세션에서는 실시간 화상 연결을 위해 참가자의 카메라와 마이크가 사용됩니다.',
      '스터디 세션의 녹화 여부와 저장 정책은 확정되는 대로 이 문서에 반영할 예정입니다.',
    ],
  },
  {
    heading: 'AI 분석 결과의 이용 범위',
    paragraphs: [
      'AI 분석 결과는 면접 연습을 돕기 위한 참고 자료로만 제공되며, 합격·불합격이나 회원의 감정 상태를 단정하는 데 사용하지 않습니다.',
    ],
  },
  {
    heading: '이용자 통제 권한',
    items: [
      '카메라·마이크 접근은 브라우저 권한 요청을 통해 회원이 직접 허용해야 시작됩니다.',
      '면접 또는 세션 진행 중 언제든 카메라·마이크를 끄거나 세션에서 나갈 수 있습니다.',
      '녹화·분석이 진행 중임을 화면에서 항상 확인할 수 있도록 표시합니다.',
    ],
  },
  {
    heading: '보관 및 삭제',
    paragraphs: [
      '수집된 답변·지표 데이터의 보관 기간과 삭제 절차는 개인정보처리방침에 따르며, 세부 보관 기간은 확정되는 대로 별도로 고지합니다.',
      '회원은 언제든 자신의 면접 기록 삭제를 요청할 수 있습니다.',
    ],
  },
]

// 녹화·AI 분석 안내 화면. 법무 검토 전 표준 초안을 조항 형식으로 노출한다.
export function RecordingNoticePage() {
  return (
    <PageLayout contentClassName="max-w-content">
      <PolicyDocument title="녹화 · AI 분석 안내" draftedOn="2026.08.05" articles={articles} />
    </PageLayout>
  )
}
