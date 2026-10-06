import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AdminSchoolClassrooms } from './routes/admin/AdminSchoolClassrooms'
import { AdminSchools } from './routes/admin/AdminSchools'
import { AdminUsers } from './routes/admin/AdminUsers'
import { AdminLogin } from './routes/login/AdminLogin'
import { RoleSelect } from './routes/login/RoleSelect'
import { StudentLogin } from './routes/login/StudentLogin'
import { TeacherLogin } from './routes/login/TeacherLogin'
import { ChallengePage } from './routes/challenge/ChallengePage'
import { WaterStateChallengePage } from './routes/challenge/WaterStateChallengePage'
import { AdminExport } from './routes/metrics/AdminExport'
import { AdminMetrics } from './routes/metrics/AdminMetrics'
import { AdminSettings } from './routes/metrics/AdminSettings'
import { ChallengeReport } from './routes/metrics/ChallengeReport'
import { MiniGameReport } from './routes/metrics/MiniGameReport'
import { TeacherMetrics } from './routes/metrics/TeacherMetrics'
import { TeacherMiniGameSettings } from './routes/teacher/TeacherMiniGameSettings'
import { OnboardingSensorial } from './routes/OnboardingSensorial'
import { StudentSensorySettings } from './routes/StudentSensorySettings'
import { RequireAuth } from './routes/RequireAuth'
import { RootRedirect } from './routes/RootRedirect'
import { SubjectSelector } from './routes/SubjectSelector'
import { HomeRouter } from './routes/home/HomeRouter'
import { TeacherChallenges } from './routes/teacher/TeacherChallenges'
import { TeacherChallengeNew } from './routes/teacher/TeacherChallengeNew'
import { TeacherChallengeEdit } from './routes/teacher/TeacherChallengeEdit'
import { TeacherAddStudent } from './routes/teacher/TeacherAddStudent'
import { TeacherStudents } from './routes/teacher/TeacherStudents'

// MJ1 - único ponto de `React.lazy` do app hoje, de propósito: é o que
// garante o AC "lazy-loading do motor de jogo... sem impacto de bundle na
// área principal de blocos" - PixiJS já é puxado eagerly por
// PixiTurtleWorld (ChallengePage), então isso não evita o Pixi já
// existente, só evita que MiniGameEngine/cenas de mini jogo entrem no
// chunk principal antes de precisar delas.
const MiniGamePage = lazy(() => import('./routes/minigame/MiniGamePage'))
// 1º mini jogo de CONTEÚDO ("Fábrica de Pedaços Iguais", frações) - mesmo
// racional de lazy-loading do MiniGamePage acima.
const FractionsGamePage = lazy(() => import('./routes/minigame/fractions/FractionsGamePage'))
// MJ10 - 2º mini jogo de CONTEÚDO ("Ferramentas do Mundo do Trabalho",
// BNCC EM13CO09, categoria Educação em Computação) - mesmo racional de
// lazy-loading.
const WorkToolsGamePage = lazy(() => import('./routes/minigame/work-tools/WorkToolsGamePage'))

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
      {/* 3.9 - mesmas opções sensoriais do onboarding (2.2), mas
          revisitáveis pelo aluno a qualquer momento, não só uma vez. */}
      <Route
        path="/settings/sensory"
        element={
          <RequireAuth roles={['student']}>
            <StudentSensorySettings />
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
      {/* 3.13/3.16 - trilha "Estados da Matéria" (domínio water_state, ver
          Topic.domain): página dedicada, nunca ChallengePage (acoplada ao
          mundo de tartaruga/Pixi). SubjectSelector.handleConfirm decide
          entre esta rota e /subjects/:topicId a partir de `topic.domain`. */}
      <Route
        path="/water/:topicId"
        element={
          <RequireAuth roles={['student']}>
            <WaterStateChallengePage />
          </RequireAuth>
        }
      />
      <Route
        path="/water/challenge/:challengeId"
        element={
          <RequireAuth roles={['student']}>
            <WaterStateChallengePage />
          </RequireAuth>
        }
      />
      {/* MJ1 - 2ª metodologia ativa (mini jogos sérios), complementar ao
          desafio de blocos pro mesmo `conceptId`. Suspense só nesta rota -
          nenhuma outra tela do app paga o custo de um fallback de
          carregamento. */}
      <Route
        path="/minigame/:conceptId"
        element={
          <RequireAuth roles={['student']}>
            <Suspense fallback={null}>
              <MiniGamePage />
            </Suspense>
          </RequireAuth>
        }
      />
      <Route
        path="/minigame/fractions/:stage"
        element={
          <RequireAuth roles={['student']}>
            <Suspense fallback={null}>
              <FractionsGamePage />
            </Suspense>
          </RequireAuth>
        }
      />
      <Route
        path="/minigame/work-tools/:stage"
        element={
          <RequireAuth roles={['student']}>
            <Suspense fallback={null}>
              <WorkToolsGamePage />
            </Suspense>
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
        path="/admin/minigames"
        element={
          <RequireAuth roles={['admin']}>
            <MiniGameReport />
          </RequireAuth>
        }
      />
      <Route
        path="/teacher/minigames"
        element={
          <RequireAuth roles={['teacher']}>
            <TeacherMiniGameSettings />
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
      <Route
        path="/admin/users"
        element={
          <RequireAuth roles={['admin']}>
            <AdminUsers />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/schools"
        element={
          <RequireAuth roles={['admin']}>
            <AdminSchools />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/schools/:schoolId/classrooms"
        element={
          <RequireAuth roles={['admin']}>
            <AdminSchoolClassrooms />
          </RequireAuth>
        }
      />
      <Route
        path="/teacher/students/new"
        element={
          <RequireAuth roles={['teacher', 'admin']}>
            <TeacherAddStudent />
          </RequireAuth>
        }
      />
      <Route
        path="/teacher/students"
        element={
          <RequireAuth roles={['teacher', 'admin']}>
            <TeacherStudents />
          </RequireAuth>
        }
      />
    </Routes>
  )
}

export default App
