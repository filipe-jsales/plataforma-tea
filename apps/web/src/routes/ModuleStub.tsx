import { Link, useParams } from 'react-router-dom';
import './StubPage.css';

// Placeholder: aqui entraria o desafio (editor Blockly + mundo PixiJS,
// ciclo PRIMM) — fora do escopo de 2.1/2.2/2.3.
export function ModuleStub() {
  const { topicId } = useParams();
  return (
    <main className="stub-page">
      <h1>Módulo</h1>
      <p>
        Aqui entraria o desafio do módulo <code>{topicId}</code> — editor de
        blocos e mundo do personagem ainda não implementados.
      </p>
      <p>
        <Link to="/home">Voltar</Link>
      </p>
    </main>
  );
}
