import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../../lib/apiClient';
import { logMiniGamePredictAnswered, logMiniGameRoundExecuted } from '../../../lib/miniGameEvents';
import { simulateSequence, matchesTarget, type FractionsFactoryCard } from '../../../lib/fractionsFactory';
import type { MiniGameLevelDto, MiniGameStage, FractionsFactoryFraction } from '../../../lib/miniGameLevelTypes';
import { useMiniGameEventLogging } from '../../../lib/useMiniGameEventLogging';
import { CardBank } from '../../../components/minigame/CardBank';
import { CardSequenceEditor } from '../../../components/minigame/CardSequenceEditor';
import { MiniGameBriefing, type MiniGameBriefingStep } from '../../../components/minigame/MiniGameBriefing';
import { MiniGameEngine } from '../../../components/minigame/MiniGameEngine';
import { createFractionsFactoryScene } from '../../../components/minigame/scenes/fractionsFactoryScene';
import { createMiniGameStore } from '../../../stores/miniGameStore';
import { createFractionsRoundStore } from '../../../stores/fractionsRoundStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { Button, InlineFeedback, LinkButton, Text, TextField } from '../../../components/ui';
import './FractionsGamePage.css';

const CONCEPT_ID = 'fractions_equal_parts';
const STAGE_SEQUENCE: MiniGameStage[] = ['use', 'modify', 'create'];

function briefingSteps(stage: MiniGameStage): MiniGameBriefingStep[] {
  if (stage === 'use') {
    return [
      { icon: '👀', label: 'Observe a sequência de cartões já pronta' },
      { icon: '▶️', label: 'Aperte Executar' },
      { icon: '🔍', label: 'Veja o resultado comparado ao pedido' },
    ];
  }
  if (stage === 'modify') {
    return [
      { icon: '👀', label: 'Observe a sequência de cartões' },
      { icon: '✏️', label: 'Corrija o cartão que não bate com o pedido' },
      { icon: '▶️', label: 'Aperte Executar' },
      { icon: '🔍', label: 'Veja o resultado comparado ao pedido' },
    ];
  }
  return [
    { icon: '🧩', label: 'Escolha os cartões da paleta' },
    { icon: '↕️', label: 'Ordene a sequência com os botões subir/descer' },
    { icon: '▶️', label: 'Aperte Executar' },
    { icon: '🔍', label: 'Veja o resultado comparado ao pedido' },
  ];
}

function pickFraction(pool: FractionsFactoryFraction[] | undefined, fallback: FractionsFactoryFraction) {
  if (!pool || pool.length === 0) return fallback;
  return pool[Math.floor(Math.random() * pool.length)];
}

function cloneSequence(cards: FractionsFactoryCard[] | undefined): FractionsFactoryCard[] {
  return cards ? cards.map((card) => ({ ...card })) : [];
}

// Fluxo por rodada: MiniGameBriefing (MJ3) → predição opcional → engine
// Pixi (fractionsFactoryScene) + CardSequenceEditor (MJ4) → "Executar" →
// InlineFeedback (MJ5) → "Novo pedido" (Make: gera outro pedido sem sair da
// tela) ou link "Próximo nível". Mapeamento PRIMM interno (sem alterar
// createMiniGameStore): predict→run na 1ª execução da rodada; toda
// tentativa incorreta seguinte fica em 'run' via recordAttempt() (mesmo
// significado de "tentativa dentro da mesma fase" já documentado em
// MJ7); ao acertar, run→investigate→modify→make em sequência marca
// 'completed' - a correção de cartão (Modify do design original) já
// aconteceu DURANTE os retries em 'run', não como uma fase separada da
// store (mesma divergência documentada já registrada pro desafio de
// blocos, "Predict mora em 3.3 e 3.4").
export function FractionsGamePage() {
  const { stage } = useParams<{ stage: string }>();
  const user = useAuthStore((state) => state.user);
  const validStage: MiniGameStage | null = STAGE_SEQUENCE.includes(stage as MiniGameStage)
    ? (stage as MiniGameStage)
    : null;

  const [levels, setLevels] = useState<MiniGameLevelDto[] | null>(null);
  const [levelsError, setLevelsError] = useState<string | null>(null);
  const [showBriefing, setShowBriefing] = useState(true);
  const [reopenedBriefing, setReopenedBriefing] = useState(false);
  const [cards, setCards] = useState<FractionsFactoryCard[]>([]);
  const [target, setTarget] = useState<FractionsFactoryFraction | null>(null);
  const [result, setResult] = useState<{ matched: boolean; totalParts: number | null; deliveredParts: number | null } | null>(null);
  const [predictValue, setPredictValue] = useState('');
  const [predictAnswered, setPredictAnswered] = useState(false);
  const [completedOnce, setCompletedOnce] = useState(false);

  // Sem `.catch()` aqui, uma falha do backend (ex.: 500 por schema
  // desatualizado num ambiente que ainda não rodou a migration mais
  // recente) deixava `levels` em `null` pra sempre - a tela ficava presa
  // em "Carregando…" indefinidamente, sem nenhum sinal do que deu errado.
  useEffect(() => {
    apiClient
      .get<MiniGameLevelDto[]>(`/minigames/levels?conceptId=${CONCEPT_ID}`)
      .then(setLevels)
      .catch((error) =>
        setLevelsError(error instanceof Error ? error.message : 'Não foi possível carregar este jogo.'),
      );
  }, []);

  const level = levels?.find((l) => l.stage === validStage) ?? null;

  const store = useMemo(() => createMiniGameStore(), [level?.id]);
  const roundStore = useMemo(() => createFractionsRoundStore(), [level?.id]);

  useEffect(() => {
    if (!level) return;
    setTarget(level.config.targetFraction);
    setCards(cloneSequence(level.config.presetSequence));
    // A store da rodada é iniciada aqui, pela própria tela - não delegada ao
    // mount assíncrono de MiniGameEngine (que também chama `startScene` ao
    // montar a Application Pixi, ver MiniGameEngine.tsx): assim `Executar`
    // funciona mesmo antes/independente do motor de renderização terminar
    // de montar (e o comportamento é testável sem depender de Pixi real).
    store.getState().startScene(level.id, CONCEPT_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, store]);
  const scene = useMemo(
    () => (level ? createFractionsFactoryScene(roundStore, level.config.theme, CONCEPT_ID) : null),
    [level, roundStore],
  );

  useMiniGameEventLogging(store, user?.pseudonymId ?? null);

  if (!validStage || !user) {
    return null;
  }

  if (levelsError) {
    return (
      <main className="fractions-game-page">
        <LinkButton to="/subjects" variant="ghost" icon="←">
          Voltar
        </LinkButton>
        <InlineFeedback kind="retry">{levelsError}</InlineFeedback>
      </main>
    );
  }

  if (!levels) {
    return (
      <main className="fractions-game-page">
        <p>Carregando…</p>
      </main>
    );
  }

  if (!level || !scene || !target) {
    return (
      <main className="fractions-game-page">
        <LinkButton to="/subjects" variant="ghost" icon="←">
          Voltar
        </LinkButton>
        <p>Este nível ainda não está disponível.</p>
      </main>
    );
  }

  function handlePredictSubmit() {
    const parts = Number(predictValue);
    if (!Number.isFinite(parts) || !user) return;
    const activeScene = store.getState().activeScene;
    if (!activeScene || !level) return;
    logMiniGamePredictAnswered(user.pseudonymId, level.id, activeScene, parts);
    setPredictAnswered(true);
  }

  function handleExecute() {
    if (!user || !level || !target) return;
    const activeScene = store.getState().activeScene;
    if (!activeScene) return;

    if (activeScene.phase === 'predict') {
      store.getState().advancePhase();
    }

    const simulation = simulateSequence(cards);
    const matched = matchesTarget(simulation, target);
    roundStore.getState().setResult(simulation.totalParts, simulation.deliveredParts);
    setResult({ matched, totalParts: simulation.totalParts, deliveredParts: simulation.deliveredParts });

    logMiniGameRoundExecuted(user.pseudonymId, level.id, store.getState().activeScene!, {
      sequence: cards,
      matchedTarget: matched,
    });

    if (matched) {
      setCompletedOnce(true);
      store.getState().advancePhase(); // run -> investigate
      store.getState().advancePhase(); // investigate -> modify
      store.getState().advancePhase(); // modify -> make (marca completed)
    } else {
      store.getState().recordAttempt();
    }
  }

  function handleNewOrder() {
    if (!level) return;
    const nextTarget = pickFraction(level.config.fractionPool, level.config.targetFraction);
    setTarget(nextTarget);
    setCards(level.stage === 'create' ? [] : cloneSequence(level.config.presetSequence));
    setResult(null);
    setPredictAnswered(false);
    setPredictValue('');
    roundStore.getState().reset();
    store.getState().startScene(level.id, CONCEPT_ID);
  }

  const nextStageIndex = STAGE_SEQUENCE.indexOf(validStage) + 1;
  const nextStage = nextStageIndex < STAGE_SEQUENCE.length ? STAGE_SEQUENCE[nextStageIndex] : null;

  return (
    <main className="fractions-game-page">
      <LinkButton to="/subjects" variant="ghost" icon="←">
        Voltar
      </LinkButton>

      {showBriefing ? (
        <MiniGameBriefing
          title={level.title}
          objective={level.prompt}
          steps={briefingSteps(validStage)}
          reopened={reopenedBriefing}
          onStart={() => setShowBriefing(false)}
        />
      ) : (
        <>
          <div className="fractions-game-page__header">
            <Text size="lg">{level.prompt}</Text>
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
          </div>

          <div className="fractions-game-page__body">
            <MiniGameEngine store={store} scene={scene} />

            <div className="fractions-game-page__editor">
              {!predictAnswered && (
                <div className="fractions-game-page__predict">
                  <Text tone="muted">Quantos pedaços você acha que vai sair? (opcional)</Text>
                  <div className="fractions-game-page__predict-row">
                    <TextField
                      id="predict-parts"
                      label="Sua previsão"
                      type="number"
                      min={1}
                      value={predictValue}
                      onChange={(e) => setPredictValue(e.target.value)}
                    />
                    <Button variant="secondary" onClick={handlePredictSubmit} disabled={!predictValue}>
                      Responder
                    </Button>
                    <Button variant="ghost" onClick={() => setPredictAnswered(true)}>
                      Pular
                    </Button>
                  </div>
                </div>
              )}

              {validStage === 'create' && <CardBank onAdd={(card) => setCards((prev) => [...prev, card])} />}

              <CardSequenceEditor cards={cards} onChange={setCards} readOnly={validStage === 'use'} />

              <Button onClick={handleExecute} disabled={cards.length === 0}>
                Executar
              </Button>

              {result && (
                <InlineFeedback kind={result.matched ? 'success' : 'retry'}>
                  {result.matched
                    ? `${result.totalParts} pedaços iguais, ${result.deliveredParts} entregue(s) ✓`
                    : `${result.totalParts ?? '-'} pedaços, ${result.deliveredParts ?? '-'} entregue(s) - o pedido pedia ${target.numerator}/${target.denominator}. Quer ajustar a sequência?`}
                </InlineFeedback>
              )}

              {completedOnce && result?.matched && (
                <div className="fractions-game-page__actions">
                  <Button variant="secondary" onClick={handleNewOrder}>
                    Novo pedido
                  </Button>
                  {nextStage && (
                    <LinkButton to={`/minigame/fractions/${nextStage}`} icon="➡️">
                      Próximo nível
                    </LinkButton>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}

export default FractionsGamePage;
