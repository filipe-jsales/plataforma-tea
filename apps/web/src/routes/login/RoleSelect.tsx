import { useNavigate } from 'react-router-dom';
import './RoleSelect.css';
import { Backpack, GraduationCap, UserShield } from 'lucide-react';

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
            <Backpack />
          </span>
          Aluno(a)
        </button>
        <button
          type="button"
          className="role-select__option"
          onClick={() => navigate('/login/teacher')}
        >
          <span className="role-select__icon" aria-hidden="true">
            <GraduationCap />
          </span>
          Professor(a)
        </button>
        <button
          type="button"
          className="role-select__option"
          onClick={() => navigate('/login/admin')}
        >
          <span className="role-select__icon" aria-hidden="true">
            <UserShield />
          </span>
          Administrador(a)
        </button>
      </div>
    </main>
  );
}
