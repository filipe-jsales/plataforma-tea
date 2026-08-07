import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { logEvent } from '../../lib/logEvent';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../../components/ui';
import './Home.css';

interface StudentHomeData {
  continueChallenge: { id: string; title: string } | null;
  progress: { completedChallengesCount: number };
}

// 2.1 — home do aluno. No máximo 2 ações principais (AC1), nenhum número
// comparativo a outros alunos, nenhum timer/contagem regressiva (AC2) —
// regra não-negociável 5 / RQ4 ansiedade social (13,04%).
export function StudentHome() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<StudentHomeData | null>(null);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiClient.get<StudentHomeData>('/home/student').then(setData);
    logEvent({
      studentPseudoId: user.pseudonymId,
      category: 'RD-I',
      type: 'home_viewed',
      payload: { role: user.role },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;

  return (
    <main className="home">
      <h1 className="home__greeting">Olá, {user.displayName}!</h1>

      <div className="home__actions">
        <Button
          variant="secondary"
          icon="▶️"
          onClick={() => navigate('/subjects')}
          disabled={!data}
        >
          Continuar{data?.continueChallenge ? `: ${data.continueChallenge.title}` : ''}
        </Button>

        <Button variant="secondary" icon="📈" onClick={() => setShowProgress((value) => !value)}>
          Meu progresso
        </Button>
      </div>

      {showProgress && data && (
        <p className="home__progress-detail">
          Você concluiu {data.progress.completedChallengesCount} desafio(s) até agora.
        </p>
      )}
    </main>
  );
}
