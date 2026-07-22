import { Route, Routes } from 'react-router-dom'
import { CommunityPage } from '@/pages/CommunityPage'
import { DashboardInterviewsPage } from '@/pages/DashboardInterviewsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DashboardStudyPage } from '@/pages/DashboardStudyPage'
import { InterviewsPage } from '@/pages/InterviewsPage'
import { LandingPage } from '@/pages/LandingPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { RecordingNoticePage } from '@/pages/RecordingNoticePage'
import { StudyPage } from '@/pages/StudyPage'
import { TermsPage } from '@/pages/TermsPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/dashboard/interviews" element={<DashboardInterviewsPage />} />
      <Route path="/dashboard/study" element={<DashboardStudyPage />} />
      <Route path="/interviews" element={<InterviewsPage />} />
      <Route path="/study" element={<StudyPage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/recording-notice" element={<RecordingNoticePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
