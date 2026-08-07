import { Route, Routes } from 'react-router-dom'
import { AdminLogin } from './routes/login/AdminLogin'
import { RoleSelect } from './routes/login/RoleSelect'
import { StudentLogin } from './routes/login/StudentLogin'
import { TeacherLogin } from './routes/login/TeacherLogin'
import { ChallengePage } from './routes/challenge/ChallengePage'
import { AdminMetrics } from './routes/metrics/AdminMetrics'
import { OnboardingSensorial } from './routes/OnboardingSensorial'
import { RequireAuth } from './routes/RequireAuth'
import { RootRedirect } from './routes/RootRedirect'
import { SubjectSelector } from './routes/SubjectSelector'
import { HomeRouter } from './routes/home/HomeRouter'

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
    </Routes>
  )
}

export default App
