import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MiniGameBriefing } from '../../components/minigame/MiniGameBriefing';
import { MiniGameEngine } from '../../components/minigame/MiniGameEngine';
import { createPlaceholderScene } from '../../components/minigame/scenes/placeholderScene';
import { useMiniGameEventLogging } from '../../lib/useMiniGameEventLogging';
import { createMiniGameStore } from '../../stores/miniGameStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button, LinkButton } from '../../components/ui';
import './MiniGamePage.css';

// MJ1 - ponto de entrada de um mini jogo na área do aluno. Importada só via
// `React.lazy` em App.tsx: é este arquivo (e só ele) que puxa
// `MiniGameEngine`/PixiJS pro bundle, então o mini jogo nunca pesa na
// rota principal de blocos (AC de MJ1, "lazy-loading... sem impacto de
// bundle na área principal"). `conceptId` na URL é o mesmo identificador
// que, no futuro (MJ8), vincula este mini jogo ao desafio de blocos
// equivalente sobre o mesmo assunto curricular.
export function MiniGamePage() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const user = useAuthStore((state) => state.user);

  // useMemo (não useState) - uma instância de store por `conceptId`, nova
  // sempre que o aluno navega pra um mini jogo diferente (mesmo racional
  // de `createTurtleExecutionStore` em ChallengePage). `conceptId` no array
  // de deps é INTENCIONAL mesmo sem aparecer no corpo da função - é a
  // chave de "quando recriar o store", não um valor que `createMiniGameStore`
  // consome.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useMemo(() => createMiniGameStore(), [conceptId]);
  const scene = useMemo(() => createPlaceholderScene(conceptId ?? 'desconhecido'), [conceptId]);

  // MJ3 - toda cena é precedida por um roteiro visual (regra não-negociável
  // 2/AC de MJ3), inclusive esta cena placeholder de infraestrutura.
  const [showBriefing, setShowBriefing] = useState(true);
  const [reopenedBriefing, setReopenedBriefing] = useState(false);

  useMiniGameEventLogging(store, user?.pseudonymId ?? null);

  if (!conceptId || !user) {
    return null;
  }

  return (
    <main className="mini-game-page">
      <LinkButton to="/subjects" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Mini jogo</h1>
      {showBriefing ? (
        <MiniGameBriefing
          title="Mini jogo"
          objective="Toque no botão até concluir todas as etapas."
          steps={[{ icon: '➡️', label: 'Toque no botão para avançar' }]}
          reopened={reopenedBriefing}
          onStart={() => setShowBriefing(false)}
        />
      ) : (
        <>
          <Button
            variant="ghost"
            icon="📋"
            onClick={() => {
              setReopenedBriefing(true);
              setShowBriefing(true);
            }}
          >
            Ver roteiro
          </Button>
          <MiniGameEngine store={store} scene={scene} />
        </>
      )}
    </main>
  );
}

export default MiniGamePage;
