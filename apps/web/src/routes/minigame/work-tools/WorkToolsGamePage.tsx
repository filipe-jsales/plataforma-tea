import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../../lib/apiClient';
import { logWorkToolsMatchMade, logWorkToolsStatementAnswered } from '../../../lib/miniGameEvents';
import {
  allScenariosCorrectlyMatched,
  allStatementsAnsweredCorrectly,
  isMatchCorrect,
  isStatementAnswerCorrect,
  pickRandomScenarios,
} from '../../../lib/workToolsMatch';
import type { WorkToolsMiniGameLevelDto, WorkToolsScenario } from '../../../lib/workToolsLevelTypes';
import type { MiniGameStage } from '../../../lib/miniGameLevelTypes';
import { useMiniGameEventLogging } from '../../../lib/useMiniGameEventLogging';
import { MiniGameBriefing, type MiniGameBriefingStep } from '../../../components/minigame/MiniGameBriefing';
import { createMiniGameStore } from '../../../stores/miniGameStore';
import { createWorkToolsRoundStore } from '../../../stores/workToolsRoundStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
  Button,
  Heading,
  InlineFeedback,
  LinkButton,
  SegmentedControl,
  SelectableCard,
  Text,
} from '../../../components/ui';
import './WorkToolsGamePage.css';

const CONCEPT_ID = 'digital_tools_workplace';
const STAGE_SEQUENCE: MiniGameStage[] = ['use', 'modify', 'create'];

// MJ10 — decisão de design: diferente de "Fábrica de Pedaços Iguais"
// (que usa MiniGameEngine/Pixi pra desenhar o objeto sendo montado), este
// jogo é mecânica de ligar/verdadeiro-falso — não existe um "mundo visual"
// pra desenhar, e a interação (selecionar cenário, selecionar ferramenta,
// julgar uma afirmação) é inerentemente melhor servida por componentes
// acessíveis reais (`components/ui`, com teclado/leitor de tela de
// graça) do que por um canvas. `MiniGameStore` (fase PRIMM/tentativas) e
// `useMiniGameEventLogging` continuam usados normalmente — só o motor de
// RENDERIZAÇÃO (Pixi) não se aplica aqui, nem todo mini jogo precisa dele.
function briefingSteps(stage: MiniGameStage): MiniGameBriefingStep[] {
  if (stage === 'use') {
    return [
      { icon: '👀', label: 'Observe como cada situação já foi ligada à ferramenta certa' },
      { icon: '🔎', label: 'Veja as afirmações verdadeiro ou falso já respondidas' },
      { icon: '✅', label: 'Aperte Conferir' },
    ];
  }
  if (stage === 'modify') {
    return [
      { icon: '👀', label: 'Observe as situações e as ferramentas já ligadas' },
      { icon: '✏️', label: 'Corrija o par ou a afirmação que não está certa' },
      { icon: '🔎', label: 'Veja o resultado de cada correção na hora' },
    ];
  }
  return [
    { icon: '👉', label: 'Toque numa situação, depois na ferramenta certa' },
    { icon: '✅', label: 'Responda verdadeiro ou falso quando os pares liberarem' },
    { icon: '🔁', label: 'Peça um novo cenário quando terminar' },
  ];
}

// Fluxo por rodada: MiniGameBriefing (MJ3) → predição opcional → duas
// colunas selecionáveis (situações/ferramentas, MJ4 — nunca drag-and-drop)
// → verdadeiro/falso liberado só com todos os pares corretos → "Novo
// cenário" (Create) ou link "Próximo nível". Mapeamento PRIMM (sem alterar
// createMiniGameStore, mesma técnica de FractionsGamePage): predict→run na
// 1ª interação da rodada; toda tentativa incorreta seguinte fica em 'run'
// via recordAttempt(); ao acertar tudo, run→investigate→modify→make marca
// 'completed'.
export function WorkToolsGamePage() {
  const { stage } = useParams<{ stage: string }>();
  const user = useAuthStore((state) => state.user);
  const validStage: MiniGameStage | null = STAGE_SEQUENCE.includes(stage as MiniGameStage)
    ? (stage as MiniGameStage)
    : null;

  const [levels, setLevels] = useState<WorkToolsMiniGameLevelDto[] | null>(null);
  const [showBriefing, setShowBriefing] = useState(true);
  const [reopenedBriefing, setReopenedBriefing] = useState(false);
  const [scenarios, setScenarios] = useState<WorkToolsScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [predictResolved, setPredictResolved] = useState(false);
  const [completedOnce, setCompletedOnce] = useState(false);

  useEffect(() => {
    apiClient.get<WorkToolsMiniGameLevelDto[]>(`/minigames/levels?conceptId=${CONCEPT_ID}`).then(setLevels);
  }, []);

  const level = levels?.find((l) => l.stage === validStage) ?? null;

  const store = useMemo(() => createMiniGameStore(), [level?.id]);
  const roundStore = useMemo(
    () =>
      createWorkToolsRoundStore(
        level
          ? { matches: level.config.presetMatches, statementAnswers: level.config.presetStatementAnswers }
          : undefined,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level?.id],
  );

  useEffect(() => {
    if (!level) return;
    setScenarios(level.config.scenarios);
    setSelectedScenarioId(null);
    setPredictResolved(false);
    setCompletedOnce(false);
    store.getState().startScene(level.id, CONCEPT_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, store]);

  useMiniGameEventLogging(store, user?.pseudonymId ?? null);

  // `roundStore` (hook de subscrição, via zustand) precisa ser chamado
  // sempre na MESMA posição em toda renderização — nunca depois de um
  // `return` condicional (regra dos hooks do React) — por isso vem antes
  // dos guards de `level`/`levels` abaixo, mesmo que só passe a importar
  // depois que `level` existir.
  const matches = roundStore((state) => state.matches);
  const statementAnswers = roundStore((state) => state.statementAnswers);

  if (!validStage || !user) {
    return null;
  }

  if (!levels) {
    return (
      <main className="work-tools-game-page">
        <p>Carregando…</p>
      </main>
    );
  }

  if (!level) {
    return (
      <main className="work-tools-game-page">
        <LinkButton to="/subjects" variant="ghost" icon="←">
          Voltar
        </LinkButton>
        <p>Este nível ainda não está disponível.</p>
      </main>
    );
  }

  const { tools, correctMatches, statements } = level.config;
  const readOnly = validStage === 'use';
  const statementsUnlocked = allScenariosCorrectlyMatched(scenarios, matches, correctMatches);

  function ensureRunPhase() {
    const activeScene = store.getState().activeScene;
    if (activeScene && activeScene.phase === 'predict') {
      store.getState().advancePhase();
    }
  }

  function checkCompletion() {
    if (completedOnce) return;
    const { matches: currentMatches, statementAnswers: currentAnswers } = roundStore.getState();
    const pairsOk = allScenariosCorrectlyMatched(scenarios, currentMatches, correctMatches);
    const statementsOk = pairsOk && allStatementsAnsweredCorrectly(statements, currentAnswers);
    if (pairsOk && statementsOk) {
      setCompletedOnce(true);
      store.getState().advancePhase(); // run -> investigate
      store.getState().advancePhase(); // investigate -> modify
      store.getState().advancePhase(); // modify -> make (marca completed)
    }
  }

  function handleSelectScenario(scenarioId: string) {
    if (readOnly) return;
    setSelectedScenarioId((prev) => (prev === scenarioId ? null : scenarioId));
  }

  function handleSelectTool(toolId: string) {
    if (readOnly || !selectedScenarioId) return;
    const activeScene = store.getState().activeScene;
    if (!activeScene) return;
    ensureRunPhase();

    const scenarioId = selectedScenarioId;
    roundStore.getState().setMatch(scenarioId, toolId);
    const correct = isMatchCorrect({ scenarioId, toolId }, correctMatches);
    logWorkToolsMatchMade(user.pseudonymId, level.id, store.getState().activeScene!, {
      scenarioId,
      toolId,
      correct,
    });
    if (!correct) store.getState().recordAttempt();
    setSelectedScenarioId(null);
    checkCompletion();
  }

  function handleUndoMatch(scenarioId: string) {
    if (readOnly) return;
    roundStore.getState().removeMatch(scenarioId);
  }

  function handleAnswerStatement(statementId: string, answeredTrue: boolean) {
    const activeScene = store.getState().activeScene;
    if (!activeScene) return;
    ensureRunPhase();

    roundStore.getState().answerStatement(statementId, answeredTrue);
    const statement = statements.find((candidate) => candidate.id === statementId);
    if (!statement) return;
    const correct = isStatementAnswerCorrect(statement, answeredTrue);
    logWorkToolsStatementAnswered(user.pseudonymId, level.id, store.getState().activeScene!, {
      statementId,
      answeredTrue,
      correct,
    });
    if (!correct) store.getState().recordAttempt();
    checkCompletion();
  }

  function handleConfirmUse() {
    ensureRunPhase();
    setCompletedOnce(true);
    store.getState().advancePhase();
    store.getState().advancePhase();
    store.getState().advancePhase();
  }

  function handlePredictChoice() {
    ensureRunPhase();
    setPredictResolved(true);
  }

  function handleNewScenarioRound() {
    const pool = level.config.scenarioPool ?? level.config.scenarios;
    const next = pickRandomScenarios(pool, level.config.scenarios.length);
    setScenarios(next);
    setSelectedScenarioId(null);
    setPredictResolved(false);
    setCompletedOnce(false);
    roundStore.getState().reset();
    store.getState().startScene(level.id, CONCEPT_ID);
  }

  const nextStageIndex = STAGE_SEQUENCE.indexOf(validStage) + 1;
  const nextStage = nextStageIndex < STAGE_SEQUENCE.length ? STAGE_SEQUENCE[nextStageIndex] : null;

  return (
    <main className="work-tools-game-page">
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
          <div className="work-tools-game-page__header">
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

          {!readOnly && !predictResolved && (
            <div className="work-tools-game-page__predict">
              <Text tone="muted">
                Antes de começar: você acha que vai ligar todas as situações certas de primeira? (opcional)
              </Text>
              <div className="work-tools-game-page__predict-row">
                <Button variant="secondary" onClick={handlePredictChoice}>
                  Sim
                </Button>
                <Button variant="secondary" onClick={handlePredictChoice}>
                  Não
                </Button>
                <Button variant="ghost" onClick={handlePredictChoice}>
                  Pular
                </Button>
              </div>
            </div>
          )}

          <section className="work-tools-game-page__matching" aria-label="Ligue cada situação à ferramenta certa">
            <Heading level={2}>Ligue cada situação à ferramenta certa</Heading>

            {readOnly ? (
              <ul className="work-tools-game-page__readonly-list">
                {scenarios.map((scenario) => {
                  const match = matches.find((candidate) => candidate.scenarioId === scenario.id);
                  const tool = match ? tools.find((candidate) => candidate.id === match.toolId) : null;
                  return (
                    <li key={scenario.id}>
                      <Text>
                        <span aria-hidden="true">{scenario.icon}</span> {scenario.label}{' '}
                        <span aria-hidden="true">→</span> <span aria-hidden="true">{tool?.icon}</span>{' '}
                        {tool?.label} <span aria-hidden="true">✅</span>
                      </Text>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="work-tools-game-page__columns">
                <div className="work-tools-game-page__column">
                  <Text tone="muted" size="sm">
                    Situações
                  </Text>
                  {scenarios.map((scenario) => {
                    const match = matches.find((candidate) => candidate.scenarioId === scenario.id);
                    const matchedTool = match ? tools.find((candidate) => candidate.id === match.toolId) : null;
                    const correct = match ? isMatchCorrect(match, correctMatches) : null;
                    return (
                      <div key={scenario.id} className="work-tools-game-page__row">
                        <SelectableCard
                          icon={scenario.icon}
                          align="start"
                          selected={selectedScenarioId === scenario.id}
                          onSelect={() => handleSelectScenario(scenario.id)}
                          meta={
                            matchedTool
                              ? `${correct ? '✅' : '🔁'} Ligado a: ${matchedTool.label}`
                              : 'Toque aqui, depois na ferramenta certa'
                          }
                        >
                          {scenario.label}
                        </SelectableCard>
                        {match && (
                          <Button
                            variant="ghost"
                            icon="↩️"
                            onClick={() => handleUndoMatch(scenario.id)}
                            aria-label={`Desfazer par de ${scenario.label}`}
                          >
                            Desfazer
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="work-tools-game-page__column">
                  <Text tone="muted" size="sm">
                    Ferramentas
                  </Text>
                  {tools.map((tool) => (
                    <SelectableCard
                      key={tool.id}
                      icon={tool.icon}
                      align="start"
                      selected={false}
                      onSelect={() => handleSelectTool(tool.id)}
                    >
                      {tool.label}
                    </SelectableCard>
                  ))}
                </div>
              </div>
            )}
          </section>

          {readOnly ? (
            <section className="work-tools-game-page__statements" aria-label="Verdadeiro ou falso">
              <Heading level={2}>Verdadeiro ou falso?</Heading>
              {statements.map((statement) => {
                const answeredTrue = level.config.presetStatementAnswers?.[statement.id] ?? statement.isTrue;
                return (
                  <div key={statement.id} className="work-tools-game-page__statement">
                    <Text>{statement.text}</Text>
                    <InlineFeedback kind="success">
                      {answeredTrue ? 'Verdadeiro' : 'Falso'} — {statement.explanation}
                    </InlineFeedback>
                  </div>
                );
              })}
            </section>
          ) : statementsUnlocked ? (
            <section className="work-tools-game-page__statements" aria-label="Verdadeiro ou falso">
              <Heading level={2}>Verdadeiro ou falso?</Heading>
              {statements.map((statement) => {
                const answered = statementAnswers[statement.id];
                const correct = answered === undefined ? null : isStatementAnswerCorrect(statement, answered);
                return (
                  <div key={statement.id} className="work-tools-game-page__statement">
                    <Text>{statement.text}</Text>
                    <SegmentedControl
                      ariaLabel={statement.text}
                      value={answered === undefined ? '' : String(answered)}
                      onValueChange={(value) => handleAnswerStatement(statement.id, value === 'true')}
                      options={[
                        { value: 'true', label: 'Verdadeiro' },
                        { value: 'false', label: 'Falso' },
                      ]}
                    />
                    {correct !== null && (
                      <InlineFeedback kind={correct ? 'success' : 'retry'}>{statement.explanation}</InlineFeedback>
                    )}
                  </div>
                );
              })}
            </section>
          ) : (
            <Text tone="muted">Responda as afirmações depois de ligar todas as situações corretamente.</Text>
          )}

          {readOnly && !completedOnce && <Button onClick={handleConfirmUse}>Conferir</Button>}

          {completedOnce && (
            <div className="work-tools-game-page__actions">
              {validStage === 'create' && (
                <Button variant="secondary" onClick={handleNewScenarioRound}>
                  Novo cenário
                </Button>
              )}
              {nextStage && (
                <LinkButton to={`/minigame/work-tools/${nextStage}`} icon="➡️">
                  Próximo nível
                </LinkButton>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default WorkToolsGamePage;
