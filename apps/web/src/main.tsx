import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme/sensory-theme.css'
import './stores/useSensoryProfileStore'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
