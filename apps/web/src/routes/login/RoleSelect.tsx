import { useNavigate } from 'react-router-dom';
import './RoleSelect.css';

// 1.2.1 — tela inicial "Quem é você?". Três botões grandes, ícone+texto,
// nenhum papel pré-selecionado, sem geolocalização/IP tentando adivinhar.
export function RoleSelect() {
  const navigate = useNavigate();

  return (
    <main className="role-select">
      <h1>Plataforma TEA</h1>
      <p>Quem é você?</p>

      <div className="role-select__options">
        <button
          type="button"
          className="role-select__option"
          onClick={() => navigate('/login/student')}
        >
          <span className="role-select__icon" aria-hidden="true">
            🎒
          </span>
          Sou aluno
        </button>
        <button
          type="button"
          className="role-select__option"
          onClick={() => navigate('/login/teacher')}
        >
          <span className="role-select__icon" aria-hidden="true">
            🍎
          </span>
          Sou professor(a)
        </button>
        <button
          type="button"
          className="role-select__option"
          onClick={() => navigate('/login/admin')}
        >
          <span className="role-select__icon" aria-hidden="true">
            🛠️
          </span>
          Sou administrador(a)
        </button>
      </div>
    </main>
  );
}
