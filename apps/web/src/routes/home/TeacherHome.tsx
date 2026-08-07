import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../stores/useAuthStore';
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
  const user = useAuthStore((state) => state.user);
  const [classrooms, setClassrooms] = useState<TeacherHomeClassroom[] | null>(null);

  useEffect(() => {
    apiClient.get<TeacherHomeClassroom[]>('/home/teacher').then(setClassrooms);
  }, []);

  if (!user) return null;

  return (
    <main className="home">
      <h1 className="home__greeting">Olá, {user.displayName}!</h1>

      <div className="home__actions">
        <Link to="/teacher/metrics" className="home__action">
          <span className="home__action-icon">📈</span>
          Painel da turma (progresso por aluno)
        </Link>
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
