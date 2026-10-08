import { useNavigate } from 'react-router-dom';
import './RoleSelect.css';
import { Backpack, GraduationCap, UserShield } from 'lucide-react';
import { Button } from '../../components/ui';

// 1.2.1 - tela inicial "Quem é você?". Três botões grandes, ícone+texto,
// nenhum papel pré-selecionado, sem geolocalização/IP tentando adivinhar.
export function RoleSelect() {
  const navigate = useNavigate();

  return (
    <main className="role-select">
      <h1>
        <img src="/logo-tea.jpg" alt="Plataforma TEA" className="role-select__logo" />
      </h1>
      <h1>Quem é você?</h1>

      <div className="role-select__options">
        <Button
          type="button"
          variant = 'secondary'
          className="role-select__option"
          onClick={() => navigate('/login/student')}
        >
          <span className="role-select__icon" aria-hidden="true">
            <Backpack />
          </span>
          Aluno(a)
        </Button>
        <Button
          type="button"
          variant = 'secondary'
          className="role-select__option"
          onClick={() => navigate('/login/teacher')}
        >
          <span className="role-select__icon" aria-hidden="true">
            <GraduationCap />
          </span>
          Professor(a)
        </Button>
        <Button
          type="button"
          variant = 'secondary'
          className="role-select__option"
          onClick={() => navigate('/login/admin')}
        >
          <span className="role-select__icon" aria-hidden="true">
            <UserShield />
          </span>
          Administrador(a)
        </Button>
      </div>
    </main>
  );
}
