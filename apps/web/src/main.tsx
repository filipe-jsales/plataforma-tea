import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './theme/sensory-theme.css'
import { useSensoryProfileStore } from './stores/useSensoryProfileStore'
import { useAuthStore } from './stores/useAuthStore'
import './index.css'
import App from './App.tsx'

// Sessão persistida (ex.: F5 na tela) já traz o perfil sensorial salvo do
// aluno — aplica antes da primeira renderização de conteúdo de jogo, sem
// esperar o aluno passar pelo onboarding de novo.
const persistedUser = useAuthStore.getState().user
if (persistedUser) {
  useSensoryProfileStore.getState().setMotionEnabled(persistedUser.animationEnabled)
  useSensoryProfileStore.getState().setSoundEnabled(persistedUser.soundEnabled)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
