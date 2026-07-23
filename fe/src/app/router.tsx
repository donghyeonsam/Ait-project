import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestOnlyRoute, HomeRoute, ProtectedRoute } from '@/app/route-guards'
import { CommunityPage } from '@/pages/CommunityPage'
import { CoverLetterPage } from '@/pages/CoverLetterPage'
import { DashboardInterviewsPage } from '@/pages/DashboardInterviewsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DashboardStudyPage } from '@/pages/DashboardStudyPage'
import { InterviewSessionPage } from '@/pages/InterviewSessionPage'
import { InterviewsPage } from '@/pages/InterviewsPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { MyPage } from '@/pages/MyPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { RecordingNoticePage } from '@/pages/RecordingNoticePage'
import { ResumePage } from '@/pages/ResumePage'
import { StudyPage } from '@/pages/StudyPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { TermsPage } from '@/pages/TermsPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/landingpage" element={<Navigate to="/" replace />} />
      <Route path="/ladingpage" element={<Navigate to="/" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/dashboard/interviews" element={<ProtectedRoute><DashboardInterviewsPage /></ProtectedRoute>} />
      <Route path="/dashboard/study" element={<ProtectedRoute><DashboardStudyPage /></ProtectedRoute>} />
      <Route path="/interviews" element={<ProtectedRoute><InterviewsPage /></ProtectedRoute>} />
      <Route path="/interviews/session" element={<ProtectedRoute><InterviewSessionPage /></ProtectedRoute>} />
      <Route path="/study" element={<ProtectedRoute><StudyPage /></ProtectedRoute>} />
      <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
      <Route path="/community/posts/:postId" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
      <Route path="/mypage" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
      <Route path="/mypage/documents" element={<Navigate to="/mypage" replace />} />
      <Route path="/mypage/documents/resume" element={<ProtectedRoute><ResumePage /></ProtectedRoute>} />
      <Route path="/mypage/documents/cover-letters/:coverLetterId" element={<ProtectedRoute><CoverLetterPage /></ProtectedRoute>} />
      <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
      <Route path="/signup" element={<GuestOnlyRoute><SignupPage /></GuestOnlyRoute>} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/recording-notice" element={<RecordingNoticePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
