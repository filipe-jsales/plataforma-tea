import { Route, Routes } from 'react-router-dom'
import { AdminLogin } from './routes/login/AdminLogin'
import { RoleSelect } from './routes/login/RoleSelect'
import { StudentLogin } from './routes/login/StudentLogin'
import { TeacherLogin } from './routes/login/TeacherLogin'
import { ChallengePage } from './routes/challenge/ChallengePage'
import { AdminExport } from './routes/metrics/AdminExport'
import { AdminMetrics } from './routes/metrics/AdminMetrics'
import { AdminSettings } from './routes/metrics/AdminSettings'
import { ChallengeReport } from './routes/metrics/ChallengeReport'
import { TeacherMetrics } from './routes/metrics/TeacherMetrics'
import { OnboardingSensorial } from './routes/OnboardingSensorial'
import { RequireAuth } from './routes/RequireAuth'
import { RootRedirect } from './routes/RootRedirect'
import { SubjectSelector } from './routes/SubjectSelector'
import { HomeRouter } from './routes/home/HomeRouter'
import { TeacherChallenges } from './routes/teacher/TeacherChallenges'
import { TeacherChallengeNew } from './routes/teacher/TeacherChallengeNew'
import { TeacherChallengeEdit } from './routes/teacher/TeacherChallengeEdit'

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<RoleSelect />} />
      <Route path="/login/student" element={<StudentLogin />} />
      <Route path="/login/teacher" element={<TeacherLogin />} />
      <Route path="/login/admin" element={<AdminLogin />} />
      <Route
        path="/onboarding"
        element={
          <RequireAuth roles={['student']}>
            <OnboardingSensorial />
          </RequireAuth>
        }
      />
      <Route
        path="/home"
        element={
          <RequireAuth>
            <HomeRouter />
          </RequireAuth>
        }
      />
      <Route
        path="/subjects"
        element={
          <RequireAuth roles={['student']}>
            <SubjectSelector />
          </RequireAuth>
        }
      />
      <Route
        path="/subjects/:topicId"
        element={
          <RequireAuth roles={['student']}>
            <ChallengePage />
          </RequireAuth>
        }
      />
      <Route
        path="/challenge/:challengeId"
        element={
          <RequireAuth roles={['student']}>
            <ChallengePage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/metrics"
        element={
          <RequireAuth roles={['admin']}>
            <AdminMetrics />
          </RequireAuth>
        }
      />
      <Route
        path="/teacher/metrics"
        element={
          <RequireAuth roles={['teacher']}>
            <TeacherMetrics />
          </RequireAuth>
        }
      />
      <Route
        path="/teacher/challenges"
        element={
          <RequireAuth roles={['teacher']}>
            <TeacherChallenges />
          </RequireAuth>
        }
      />
      <Route
        path="/teacher/challenges/new"
        element={
          <RequireAuth roles={['teacher']}>
            <TeacherChallengeNew />
          </RequireAuth>
        }
      />
      <Route
        path="/teacher/challenges/:challengeId/edit"
        element={
          <RequireAuth roles={['teacher']}>
            <TeacherChallengeEdit />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <RequireAuth roles={['admin']}>
            <ChallengeReport />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <RequireAuth roles={['admin']}>
            <AdminSettings />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/export"
        element={
          <RequireAuth roles={['admin']}>
            <AdminExport />
          </RequireAuth>
        }
      />
    </Routes>
  )
}

export default App
