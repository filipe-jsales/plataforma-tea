import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { useAuthStore } from '../../stores/useAuthStore';
import { LinkButton } from '../../components/ui';
import './Home.css';

interface AdminHomeData {
  schoolsCount: number;
  classroomsCount: number;
  usersCount: number;
}

// 2.1 — home do admin. Só contagens agregadas (AC4) — nenhum dado no nível
// de aluno individual nesta tela, mesmo que o admin tenha acesso técnico a
// isso em outra tela futura.
export function AdminHome() {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<AdminHomeData | null>(null);

  useEffect(() => {
    apiClient.get<AdminHomeData>('/home/admin').then(setData);
  }, []);

  if (!user) return null;

  return (
    <main className="home staff-theme">
      <h1 className="home__greeting">Olá, {user.displayName}!</h1>

      <div className="home__actions">
        <LinkButton to="/admin/metrics" icon="📊">
          Painel institucional (escolas, turmas, professores)
        </LinkButton>
        <LinkButton to="/admin/reports" icon="🔬">
          Relatório de profundidade por desafio
        </LinkButton>
        <LinkButton to="/admin/settings" icon="⚙️" variant="secondary">
          Configurações
        </LinkButton>
      </div>

      {data && (
        <div className="home__stats">
          <div className="home__stat">
            <span className="home__stat-value">{data.schoolsCount}</span>
            <span className="home__stat-label">escolas</span>
          </div>
          <div className="home__stat">
            <span className="home__stat-value">{data.classroomsCount}</span>
            <span className="home__stat-label">turmas</span>
          </div>
          <div className="home__stat">
            <span className="home__stat-value">{data.usersCount}</span>
            <span className="home__stat-label">usuários</span>
          </div>
        </div>
      )}
    </main>
  );
}
