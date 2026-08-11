import * as Blockly from 'blockly/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BlocklyWorkspace, type WorkspaceSvg } from 'react-blockly';
import { WaterStateTransition } from '../../components/challenge/WaterStateTransition';
import { InlineFeedback, Slider } from '../../components/ui';
import {
  applyGenerousSnapTolerance,
  applyModifyFieldLocking,
  registerBlockDefinitions,
  type EditableFieldConfig,
  type ToolboxCategory,
} from '../../lib/blocklyToolbox';
import { apiClient } from '../../lib/apiClient';
import { diffChangedValues, extractEditableFieldValues } from '../../lib/editableFields';
import {
  resolveRetryMessage,
  resolveSuccessMessage,
  type ChallengeFeedbackMessages,
} from '../../lib/feedbackMessages';
import { logEvent } from '../../lib/logEvent';
import { interpretWaterProgram, type SerializedBlock, type WaterState } from '../../lib/waterProgram';
import { useAuthStore } from '../../stores/useAuthStore';
import './WaterStateChallengePage.css';

// Mesma tolerância de encaixe generosa que ChallengePage.tsx já aplica —
// `Blockly.config` é global (não por-workspace), então qualquer tela que
// injeta um workspace precisa deste `applyGenerousSnapTolerance()` no
// carregamento do módulo (mesmo racional documentado lá).
applyGenerousSnapTolerance();

const TEMPERATURE_MIN_C = -20;
const TEMPERATURE_MAX_C = 150;

const STATE_LABEL: Record<WaterState, string> = {
  SOLID: 'sólido',
  LIQUID: 'líquido',
  GAS: 'gasoso',
};

interface WaterChallengeGoal {
  initialTemperatureC: number;
  boilingThresholdC: number;
}

interface WaterChallengeDetail {
  id: string;
  title: string;
  prompt: string;
  locked: boolean;
  toolbox: { stage: string; categories: ToolboxCategory[] };
  goal: WaterChallengeGoal;
  program: SerializedBlock | null;
  predictQuestion: string | null;
  editableFields: EditableFieldConfig[];
  nextChallengeId: string | null;
  snapTolerancePercent: number | null;
  blockScale: number | null;
  feedbackMessages: ChallengeFeedbackMessages | null;
}

type Feedback = { kind: 'success' | 'retry'; message: string } | null;

// Motor PRIMM "Predict" (mesma semântica de ChallengePage.tsx): 'predict'
// trava o botão Executar até o aluno escolher um estado previsto; volta pra
// 'predict' depois de cada execução, já que a temperatura/limiar podem
// mudar a cada rodada.
type PrimmStage = 'predict' | 'run';

function toInitialWorkspaceJson(program: SerializedBlock): object {
  return { blocks: { languageVersion: 0, blocks: [program] } };
}

// 3.13/3.14/3.16 — página dedicada da trilha "Estados da Matéria" (domínio
// `water_state`, ver Topic.domain/AddDomainToTopics): NÃO reaproveita
// ChallengePage.tsx, que é acoplada ao mundo de tartaruga/Pixi (goal com
// sides/turnAngleDeg, PixiTurtleWorld fixo, interpretador sem ramificação)
// — mesmo isolamento por domínio que PixiTurtleWorld/turtleWorld.ts já têm.
// Reaproveita só a infraestrutura genérica: blocklyToolbox.ts (registro de
// blocos, travamento de campo em Modify), editableFields.ts (diff de
// valores), feedbackMessages.ts, lib/logEvent.ts — nada específico de
// tartaruga entra aqui.
//
// Sem fase `create`/autosave nesta trilha ainda (2.3 fica pra depois): a
// estrutura do programa (o `conditional_if`) é SEMPRE pré-montada — só o
// valor do limiar fica editável na fase `modify`, mesmo mecanismo de
// TIMES/ANGLE em ChallengePage (campo destravado via applyModifyFieldLocking,
// nunca uma toolbox própria de "blocos numéricos" — decisão documentada na
// migration SeedEstadosDaMateriaTopic).
export function WaterStateChallengePage() {
  const { topicId, challengeId } = useParams<{ topicId?: string; challengeId?: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [challenge, setChallenge] = useState<WaterChallengeDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [attempts, setAttempts] = useState(0);
  const [proceeded, setProceeded] = useState(false);
  const [primmStage, setPrimmStage] = useState<PrimmStage>('predict');
  const [predictedState, setPredictedState] = useState<WaterState | null>(null);
  const [temperatureC, setTemperatureC] = useState(0);
  // Estado exibido pela transição sensorial (3.16) — representa "o estado
  // conhecido da água agora", só muda quando o aluno de fato Executa (nunca
  // reage ao slider em tempo real, que é só uma hipótese sendo ajustada).
  const [displayedState, setDisplayedState] = useState<WaterState>('LIQUID');

  const workspaceRef = useRef<WorkspaceSvg | null>(null);
  // RD-E — tempo na fase (engajamento-proxy, regra não-negociável 7: só o
  // número bruto, nunca inferência clínica), medido do carregamento até
  // "Avançar".
  const mountedAtRef = useRef(Date.now());

  useEffect(() => {
    setChallenge(null);
    setNotFound(false);
    setFeedback(null);
    setAttempts(0);
    setProceeded(false);
    setPrimmStage('predict');
    setPredictedState(null);
    mountedAtRef.current = Date.now();

    const path = topicId ? `/challenges/by-topic/${topicId}` : `/challenges/${challengeId}`;
    apiClient
      .get<WaterChallengeDetail>(path)
      .then((detail) => {
        registerBlockDefinitions(detail.toolbox.categories);
        setTemperatureC(detail.goal.initialTemperatureC);
        // Estado inicial derivado do próprio programa (nunca hardcoded a um
        // valor de domínio) — 'LIQUID' é só o fallback se o programa não
        // decidir nada (defesa em profundidade, não deveria acontecer com o
        // currículo seedado).
        setDisplayedState(
          interpretWaterProgram(detail.program, detail.goal.initialTemperatureC) ?? 'LIQUID',
        );
        setChallenge(detail);
      })
      .catch(() => setNotFound(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, challengeId]);

  useEffect(() => {
    if (!challenge) return;
    // E1 — mesmo marcador "Novo" do resto da plataforma (ver ChallengePage);
    // endpoint idempotente, falha de rede nunca trava a tela.
    apiClient.post(`/students/me/classroom-challenges/${challenge.id}/viewed`).catch(() => {});
  }, [challenge]);

  const isModify = challenge?.toolbox.stage === 'modify';

  const initialJson = useMemo(() => {
    if (!challenge?.program) return undefined;
    return toInitialWorkspaceJson(challenge.program);
  }, [challenge]);

  const editableInitialValues = useMemo(
    () => (challenge ? extractEditableFieldValues(challenge.program, challenge.editableFields) : {}),
    [challenge],
  );

  // 3.14 (RD-I, evento `thresholdChanged`) — casado contra `editableFields`
  // (nunca hardcoded "THRESHOLD"), mesmo racional domínio-agnóstico de
  // applyModifyFieldLocking: um `modify` futuro noutro tópico com outro
  // nome de campo funciona aqui sem mudança.
  function handleWorkspaceFieldChange(event: Blockly.Events.Abstract) {
    if (!challenge || !user) return;
    if (!(event instanceof Blockly.Events.BlockChange) || event.element !== 'field') return;
    const isEditableField = challenge.editableFields.some((field) => field.fieldName === event.name);
    if (!isEditableField) return;

    logEvent({
      studentPseudoId: user.pseudonymId,
      category: 'RD-I',
      type: 'thresholdChanged',
      challengeId: challenge.id,
      payload: {
        challenge_id: challenge.id,
        field_name: event.name,
        previous_value: event.oldValue,
        new_value: event.newValue,
        timestamp: new Date().toISOString(),
      },
    });
  }

  function handlePredict(state: WaterState) {
    setPredictedState(state);
    setPrimmStage('run');
  }

  // 3.13 (RD-I) — só quando o aluno TERMINA de mexer no slider (ver
  // Slider.onValueCommit), nunca a cada pixel do arrasto.
  function handleTemperatureCommit(value: number) {
    if (!challenge || !user) return;
    logEvent({
      studentPseudoId: user.pseudonymId,
      category: 'RD-I',
      type: 'temperature_slider_changed',
      challengeId: challenge.id,
      payload: { challenge_id: challenge.id, temperature_c: value, timestamp: new Date().toISOString() },
    });
  }

  function handleRun() {
    const workspace = workspaceRef.current;
    if (!workspace || !challenge || !user) return;
    // Mesma defesa em profundidade de ChallengePage.handleRun: o botão
    // Executar nem aparece nesse estado (ver JSX), isto é cinto e suspensório.
    if (challenge.predictQuestion && predictedState === null) return;

    const topBlock = workspace.getTopBlocks(true)[0] ?? null;
    const serialized = topBlock
      ? (Blockly.serialization.blocks.save(topBlock, {
          addInputBlocks: true,
          addNextBlocks: true,
        }) as SerializedBlock | null)
      : null;

    const actualState = interpretWaterProgram(serialized, temperatureC);
    setDisplayedState(actualState ?? displayedState);
    setAttempts((count) => count + 1);

    // 3.13/3.14 (RD-P) — snapshot do programa por execução, mesmo racional
    // de `program_executed` em ChallengePage.
    logEvent({
      studentPseudoId: user.pseudonymId,
      category: 'RD-P',
      type: 'program_executed',
      challengeId: challenge.id,
      payload: {
        challenge_id: challenge.id,
        block_sequence_json: serialized,
        temperature_c: temperatureC,
        resulting_state: actualState,
        timestamp: new Date().toISOString(),
      },
    });

    const matched = actualState !== null && predictedState !== null && actualState === predictedState;
    // 3.13 (RD-C) — predição declarada vs. resultado real.
    logEvent({
      studentPseudoId: user.pseudonymId,
      category: 'RD-C',
      type: 'water_state_prediction',
      challengeId: challenge.id,
      payload: {
        challenge_id: challenge.id,
        prediction_given: predictedState,
        actual_state: actualState,
        result_matched_prediction: matched,
        timestamp: new Date().toISOString(),
      },
    });

    if (isModify) {
      const currentValues = extractEditableFieldValues(serialized, challenge.editableFields);
      const changedValues = diffChangedValues(editableInitialValues, currentValues);
      // 3.14 — mesmo evento `challenge_modify_attempt` que a Geometria já
      // usa (ChallengePage.handleRun), reaproveitado sem mudança de forma.
      logEvent({
        studentPseudoId: user.pseudonymId,
        category: 'RD-P',
        type: 'challenge_modify_attempt',
        challengeId: challenge.id,
        payload: {
          challenge_id: challenge.id,
          changed_values: changedValues,
          prediction_given: predictedState,
          result_matched_prediction: matched,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 3.13 (AC4) — linguagem sempre descritiva, nunca "errado" (regra
    // não-negociável 4): compara o que o aluno imaginou com o que
    // aconteceu, sem avaliar a tentativa como certa/errada.
    const predictedLabel = predictedState ? STATE_LABEL[predictedState] : null;
    setFeedback(
      matched
        ? { kind: 'success', message: resolveSuccessMessage(challenge.feedbackMessages) }
        : {
            kind: 'retry',
            message:
              actualState && predictedLabel
                ? `Você imaginou que a água ficaria ${predictedLabel}, mas ela ficou ${STATE_LABEL[actualState]}. Quer tentar outra temperatura?`
                : resolveRetryMessage(challenge.feedbackMessages),
          },
    );
    logEvent({
      studentPseudoId: user.pseudonymId,
      category: 'RD-I',
      type: 'feedback_shown',
      challengeId: challenge.id,
      payload: {
        challenge_id: challenge.id,
        feedback_type: matched ? 'success' : 'neutral',
        stage: challenge.toolbox.stage,
        timestamp: new Date().toISOString(),
      },
    });

    setPredictedState(null);
    if (challenge.predictQuestion) {
      setPrimmStage('predict');
    }
  }

  function handleProceed() {
    if (!challenge || !user || attempts < 1) return;
    setProceeded(true);

    logEvent({
      studentPseudoId: user.pseudonymId,
      category: 'RD-E',
      type: 'challenge_time_in_phase',
      challengeId: challenge.id,
      payload: {
        challenge_id: challenge.id,
        attempts_before_proceed: attempts,
        time_in_phase_ms: Date.now() - mountedAtRef.current,
        timestamp: new Date().toISOString(),
      },
    });

    if (challenge.nextChallengeId) {
      navigate(`/water/challenge/${challenge.nextChallengeId}`);
    }
  }

  if (notFound) {
    return (
      <main className="water-challenge-page">
        <p>Este módulo ainda não tem um desafio disponível.</p>
        <Link to="/subjects">Voltar</Link>
      </main>
    );
  }

  if (!challenge || !user) {
    return null;
  }

  return (
    <main className="water-challenge-page">
      <Link to="/subjects" className="water-challenge-page__back-link">
        ← Voltar
      </Link>
      <h1>{challenge.title}</h1>
      <p className="water-challenge-page__prompt">{challenge.prompt}</p>

      <div className="water-challenge-page__layout">
        <BlocklyWorkspace
          key={challenge.id}
          className="water-challenge-page__editor"
          initialJson={initialJson}
          workspaceConfiguration={{
            readOnly: challenge.locked,
            trashcan: false,
            grid: { spacing: 24, length: 3, colour: '#d7dbe0', snap: false },
            zoom: { controls: !challenge.locked, wheel: false, startScale: challenge.blockScale ?? 1 },
            move: { scrollbars: true, drag: !challenge.locked, wheel: false },
          }}
          onInject={(workspace) => {
            workspaceRef.current = workspace;
            workspace.addChangeListener(handleWorkspaceFieldChange);
            // Mesmo racional de ChallengePage: Blockly.config é global, não
            // por-workspace, então reaplica pra ESTE desafio a cada carga.
            applyGenerousSnapTolerance(challenge.snapTolerancePercent ?? undefined);
            if (isModify) {
              applyModifyFieldLocking(workspace, challenge.editableFields);
            }
          }}
          onDispose={(workspace) => {
            workspace.removeChangeListener(handleWorkspaceFieldChange);
          }}
        />

        <aside className="water-challenge-page__sidebar">
          <WaterStateTransition state={displayedState} />

          <Slider
            min={TEMPERATURE_MIN_C}
            max={TEMPERATURE_MAX_C}
            value={temperatureC}
            onValueChange={setTemperatureC}
            onValueCommit={handleTemperatureCommit}
            ariaLabel="Temperatura"
            unit="°C"
          />

          {/* Motor PRIMM "Predict": a previsão é sempre a primeira ação
              disponível antes de Executar, nunca uma etapa que dá pra pular
              — mesmo padrão de ChallengePage. */}
          {challenge.predictQuestion && primmStage === 'predict' ? (
            <div className="water-challenge-page__predict">
              <p>{challenge.predictQuestion}</p>
              <div className="water-challenge-page__predict-options">
                <button
                  type="button"
                  className="water-challenge-page__predict-option"
                  onClick={() => handlePredict('SOLID')}
                >
                  ❄️ Sólido
                </button>
                <button
                  type="button"
                  className="water-challenge-page__predict-option"
                  onClick={() => handlePredict('LIQUID')}
                >
                  💧 Líquido
                </button>
                <button
                  type="button"
                  className="water-challenge-page__predict-option"
                  onClick={() => handlePredict('GAS')}
                >
                  ☁️ Gasoso
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="water-challenge-page__run-button" onClick={handleRun}>
              {attempts > 0 ? '🔁 Repetir execução' : '▶️ Executar'}
            </button>
          )}

          {feedback && <InlineFeedback kind={feedback.kind}>{feedback.message}</InlineFeedback>}

          {attempts > 0 && (
            <div className="water-challenge-page__proceed">
              <button
                type="button"
                className="water-challenge-page__proceed-button"
                onClick={handleProceed}
                disabled={attempts < 1}
              >
                Avançar
              </button>
              {proceeded && !challenge.nextChallengeId && (
                <p>Você concluiu esta fase! O próximo desafio ainda está sendo preparado.</p>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
