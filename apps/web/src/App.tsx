import './App.css'
import { useSensoryProfileStore } from './stores/useSensoryProfileStore'

// Placeholder de instalação: confirma que tema sensorial + store Zustand estão
// funcionando de ponta a ponta. As telas de Estudante/Professor/Admin, o editor
// Blockly e o mundo PixiJS são implementados nas próximas etapas.
function App() {
  const { motionEnabled, soundEnabled, highContrast, setMotionEnabled, setSoundEnabled, setHighContrast } =
    useSensoryProfileStore()

  return (
    <main className="setup-check">
      <h1>Plataforma TEA</h1>
      <p>Instalação base do front (React + Vite) concluída.</p>

      <section aria-labelledby="sensory-heading">
        <h2 id="sensory-heading">Configurações sensoriais (opt-in, desligadas por padrão)</h2>
        <label>
          <input
            type="checkbox"
            checked={motionEnabled}
            onChange={(e) => setMotionEnabled(e.target.checked)}
          />
          Ativar animações
        </label>
        <label>
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
          />
          Ativar sons
        </label>
        <label>
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(e) => setHighContrast(e.target.checked)}
          />
          Alto contraste
        </label>
      </section>
    </main>
  )
}

export default App
