import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { performLogout } from '../../lib/logout';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button, LinkButton } from '../../components/ui';
import './Home.css';

interface TeacherHomeClassroom {
  id: string;
  name: string;
  joinCode: string;
  activeStudentsToday: number;
}

// 2.1 — home do professor. Indicador neutro de atividade recente por turma
// ("N alunos com atividade hoje"), nunca ranking de alunos (AC3) — RD-E
// como sinal observável agregado, não inferência individual.
export function TeacherHome() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [classrooms, setClassrooms] = useState<TeacherHomeClassroom[] | null>(null);

  useEffect(() => {
    apiClient.get<TeacherHomeClassroom[]>('/home/teacher').then(setClassrooms);
  }, []);

  function handleLogout() {
    if (!user) return;
    performLogout(user);
    navigate('/login', { replace: true });
  }

  if (!user) return null;

  return (
    <main className="home staff-theme">
      <div className="home__topbar">
        <Button variant="ghost" icon="🚪" onClick={handleLogout}>
          Sair
        </Button>
      </div>

      <h1 className="home__greeting">Olá, {user.displayName}!</h1>

      <div className="home__actions">
        <LinkButton to="/teacher/students/new" icon="➕">
          Adicionar aluno
        </LinkButton>
        <LinkButton to="/teacher/students" icon="🧑‍🤝‍🧑">
          Meus alunos
        </LinkButton>
        <LinkButton to="/teacher/metrics" icon="📈">
          Painel da turma (progresso por aluno)
        </LinkButton>
        <LinkButton to="/teacher/challenges" icon="🧩">
          Meus desafios
        </LinkButton>
      </div>

      {classrooms && classrooms.length === 0 && <p>Nenhuma turma atribuída ainda.</p>}

      {classrooms && classrooms.length > 0 && (
        <ul className="home__list">
          {classrooms.map((classroom) => (
            <li key={classroom.id} className="home__list-item">
              <div className="home__list-item-name">{classroom.name}</div>
              <div className="home__list-item-meta">Código: {classroom.joinCode}</div>
              <div className="home__list-item-meta">
                {classroom.activeStudentsToday} aluno(s) com atividade hoje
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
