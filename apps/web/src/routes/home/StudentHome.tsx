import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { logEvent } from "../../lib/logEvent";
import { performLogout } from "../../lib/logout";
import { useAuthStore } from "../../stores/useAuthStore";
import { Button, LinkButton } from "../../components/ui";
import "./Home.css";
import { LogOut, Play, TrendingUp, Settings, PartyPopper } from "lucide-react";

interface StudentHomeData {
  continueChallenge: { id: string; title: string } | null;
  progress: { completedChallengesCount: number };
  // 7.3 — `null` sempre que a turma não ativou a comparação (padrão) ou não
  // há colega pra comparar contra. Nunca nome/rank/número de outro aluno.
  classComparison: { amongMostActiveThisWeek: boolean } | null;
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
    apiClient.get<StudentHomeData>("/home/student").then(setData);
    logEvent({
      studentPseudoId: user.pseudonymId,
      category: "RD-I",
      type: "home_viewed",
      payload: { role: user.role },
    });
  }, [user?.id]);

  // 7.3 — loga uma vez quando o dado chega, nunca a cada clique em "Meu
  // progresso" (o AC é sobre o dado estar/não estar disponível, não sobre
  // o aluno ter revelado a seção).
  useEffect(() => {
    if (!user || !data) return;
    logEvent({
      studentPseudoId: user.pseudonymId,
      category: "RD-I",
      type: "class_comparison_shown",
      payload: { shown: data.classComparison !== null },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function handleLogout() {
    if (!user) return;
    performLogout(user);
    navigate("/login", { replace: true });
  }

  if (!user) return null;

  return (
    <main className="home">
      {/* 1.5.1 — "Sair" fica fora de home__actions: não é uma das "no
          máximo 2 ações principais" (AC1), é uma ação de escape sempre
          disponível mas discreta. */}
      <div className="home__topbar">
        {/* 3.9 — mesmo racional de "Sair": ação de escape sempre
            disponível, mas discreta, fora das "no máximo 2 ações
            principais" (AC1). */}
        <LinkButton
          to="/settings/sensory"
          variant="secondary"
          icon={<Settings color="#000000" strokeWidth={1.75} />}
        >
          Configurações
        </LinkButton>
        <Button
          variant="secondary"
          icon={<LogOut color="#000000" strokeWidth={1.75} />}
          onClick={handleLogout}
        >
          Sair
        </Button>
      </div>

      <h1 className="home__greeting">Olá, {user.displayName}!</h1>

      <div className="home__actions">
        <Button
          variant="secondary"
          icon={<Play color="#000000" strokeWidth={1.75} />}
          onClick={() => navigate("/subjects")}
          disabled={!data}
        >
          Continuar
          {data?.continueChallenge ? `: ${data.continueChallenge.title}` : ""}
        </Button>

        <Button
          variant="secondary"
          icon={<TrendingUp color="#000000" strokeWidth={1.75} />}
          onClick={() => setShowProgress((value) => !value)}
        >
          Meu progresso
        </Button>
      </div>

      {showProgress && data && (
        <p className="home__progress-detail">
          Você concluiu {data.progress.completedChallengesCount} desafio(s) até
          agora.
        </p>
      )}

      {/* 7.3 — só aparece quando o PROFESSOR ativou a comparação pra esta
          turma (padrão: desligado). Sempre agregado/anônimo — nunca nome,
          avatar ou posição de um colega específico (regra não-negociável 5). */}
      {showProgress && data?.classComparison?.amongMostActiveThisWeek && (
        <p className="home__progress-detail home__progress-comparison">
          Você está entre os alunos que mais praticaram esta semana.{" "}
          <PartyPopper />
        </p>
      )}
    </main>
  );
}
