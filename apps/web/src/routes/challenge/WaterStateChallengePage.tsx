import * as Blockly from 'blockly/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BlocklyWorkspace, type WorkspaceSvg } from 'react-blockly';
import { WaterStateTransition } from '../../components/challenge/WaterStateTransition';
import { InlineFeedback, Slider } from '../../components/ui';
import {
  applyGenerousSnapTolerance,
  applyModifyFieldLocking,
  buildToolboxConfiguration,
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
import {
  ALL_WATER_STATES,
  evaluateWaterStatesCoverage,
  interpretWaterProgram,
  type SerializedBlock,
  type WaterState,
} from '../../lib/waterProgram';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSensoryProfileStore } from '../../stores/useSensoryProfileStore';
import './WaterStateChallengePage.css';

// Mesma técnica de PixiTurtleWorld.tsx (loop com `sleep` redesenhando a
// cada passo, sem lib de animação) - aqui em vez de segmentos de linha,
// cada passo reamostra o intérprete numa temperatura intermediária entre a
// última execução e a nova, então o ícone/temperatura "viaja" por SOLID→
// LIQUID→GAS em vez de trocar instantaneamente.
const TEMPERATURE_ANIMATION_STEPS = 12;
const TEMPERATURE_ANIMATION_STEP_MS = 90;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildTemperatureTicks(fromTemperatureC: number, toTemperatureC: number): number[] {
  return Array.from(
    { length: TEMPERATURE_ANIMATION_STEPS },
    (_, i) => fromTemperatureC + ((toTemperatureC - fromTemperatureC) * (i + 1)) / TEMPERATURE_ANIMATION_STEPS,
  );
}

// Mesma tolerância de encaixe generosa que ChallengePage.tsx já aplica -
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

// 3.13/3.14/3.16 - página dedicada da trilha "Estados da Matéria" (domínio
// `water_state`, ver Topic.domain/AddDomainToTopics): NÃO reaproveita
// ChallengePage.tsx, que é acoplada ao mundo de tartaruga/Pixi (goal com
// sides/turnAngleDeg, PixiTurtleWorld fixo, interpretador sem ramificação)
// - mesmo isolamento por domínio que PixiTurtleWorld/turtleWorld.ts já têm.
// Reaproveita só a infraestrutura genérica: blocklyToolbox.ts (registro de
// blocos, travamento de campo em Modify), editableFields.ts (diff de
// valores), feedbackMessages.ts, lib/logEvent.ts - nada específico de
// tartaruga entra aqui.
//
// Sem fase `create`/autosave nesta trilha ainda (2.3 fica pra depois): a
// estrutura do programa (o `conditional_if`) é SEMPRE pré-montada - só o
// valor do limiar fica editável na fase `modify`, mesmo mecanismo de
// TIMES/ANGLE em ChallengePage (campo destravado via applyModifyFieldLocking,
// nunca uma toolbox própria de "blocos numéricos" - decisão documentada na
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
  // Estado exibido pela transição sensorial (3.16) - representa "o estado
  // conhecido da água agora", só muda quando o aluno de fato Executa (nunca
  // reage ao slider em tempo real, que é só uma hipótese sendo ajustada).
  const [displayedState, setDisplayedState] = useState<WaterState>('LIQUID');
  // Temperatura que acompanha `displayedState` durante a animação (3.16) -
  // desacoplada de `temperatureC` (o valor do slider, que é só a hipótese
  // sendo ajustada e nunca deve "andar sozinho").
  const [displayedTemperatureC, setDisplayedTemperatureC] = useState(0);

  const workspaceRef = useRef<WorkspaceSvg | null>(null);
  // RD-E - tempo na fase (engajamento-proxy, regra não-negociável 7: só o
  // número bruto, nunca inferência clínica), medido do carregamento até
  // "Avançar".
  const mountedAtRef = useRef(Date.now());
  // 3.13 (RD-I) - instante em que o aluno confirmou a predição, pra medir
  // quanto tempo levou até "Executar" (engajamento-proxy com a hipótese,
  // não corretude). `null` fora de uma rodada com Predict pendente (ex.:
  // desafio `create`, que não tem `predictQuestion`).
  const predictedAtRef = useRef<number | null>(null);
  // Temperatura de onde a PRÓXIMA animação deve partir - a da última
  // execução (ou a inicial do desafio, antes da primeira). Guardada em ref
  // (não state) porque só o loop de animação lê/escreve, nunca o render.
  const lastRunTemperatureRef = useRef(0);
  // Token de cancelamento - mesmo padrão de `cancelled`/`runToken` em
  // PixiTurtleWorld/turtleExecutionStore: incrementar invalida qualquer
  // loop em voo (nova execução ou troca de desafio).
  const animationTokenRef = useRef(0);
  const motionEnabled = useSensoryProfileStore((s) => s.motionEnabled);
  // 3.16 AC2 - padrão sensorial sem animação automática (mesmo racional do
  // botão "Próximo passo" de PixiTurtleWorld/ChallengePage): em vez de só
  // pular pro resultado final, o aluno avança um tique por clique. Fila de
  // temperaturas restantes vive em ref (não precisa re-render por si só);
  // `stepStatus` é o que decide se o botão aparece.
  const pendingStepsRef = useRef<{ serialized: SerializedBlock | null; temperatures: number[] } | null>(
    null,
  );
  const [stepStatus, setStepStatus] = useState<'idle' | 'stepping'>('idle');

  useEffect(() => {
    setChallenge(null);
    setNotFound(false);
    setFeedback(null);
    setAttempts(0);
    setProceeded(false);
    setPrimmStage('predict');
    setPredictedState(null);
    predictedAtRef.current = null;
    mountedAtRef.current = Date.now();
    // Cancela qualquer animação/passo-a-passo da tela anterior antes de
    // montar a nova.
    animationTokenRef.current += 1;
    pendingStepsRef.current = null;
    setStepStatus('idle');

    const path = topicId ? `/challenges/by-topic/${topicId}` : `/challenges/${challengeId}`;
    apiClient
      .get<WaterChallengeDetail>(path)
      .then((detail) => {
        registerBlockDefinitions(detail.toolbox.categories);
        setTemperatureC(detail.goal.initialTemperatureC);
        // Estado inicial derivado do próprio programa (nunca hardcoded a um
        // valor de domínio) - 'LIQUID' é só o fallback se o programa não
        // decidir nada (defesa em profundidade, não deveria acontecer com o
        // currículo seedado).
        setDisplayedState(
          interpretWaterProgram(detail.program, detail.goal.initialTemperatureC) ?? 'LIQUID',
        );
        setDisplayedTemperatureC(detail.goal.initialTemperatureC);
        lastRunTemperatureRef.current = detail.goal.initialTemperatureC;
        setChallenge(detail);
      })
      .catch(() => setNotFound(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, challengeId]);

  // 3.16 - anima o ícone/temperatura passando pelos estados intermediários
  // entre a última execução e a nova (ex.: gelo a 0°C → água a 20°C mostra
  // o gelo derretendo no meio do caminho), mesma técnica de passo-fixo do
  // PixiTurtleWorld (loop com `sleep`, sem lib de animação). Reamostra o
  // MESMO intérprete puro (`interpretWaterProgram`) a cada passo - nunca
  // precisa conhecer o limiar do programa, só variar a temperatura.
  async function animateStateTransition(
    serialized: SerializedBlock | null,
    fromTemperatureC: number,
    toTemperatureC: number,
  ) {
    const token = ++animationTokenRef.current;
    for (const tickTemperatureC of buildTemperatureTicks(fromTemperatureC, toTemperatureC)) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(TEMPERATURE_ANIMATION_STEP_MS);
      if (animationTokenRef.current !== token) return;
      setDisplayedTemperatureC(tickTemperatureC);
      const tickState = interpretWaterProgram(serialized, tickTemperatureC);
      if (tickState) setDisplayedState(tickState);
    }
  }

  // 3.16 AC2 - contraparte do "Próximo passo" quando o perfil sensorial tem
  // movimento reduzido: cada clique consome um tique da fila e redesenha,
  // igual a `advanceStep()` do turtleExecutionStore, só que sem store
  // dedicado (a fila cabe inteira num ref porque só esta tela a usa).
  function handleAdvanceWaterStep() {
    const pending = pendingStepsRef.current;
    if (!pending || pending.temperatures.length === 0) return;
    const [nextTemperatureC, ...rest] = pending.temperatures;
    pending.temperatures = rest;
    setDisplayedTemperatureC(nextTemperatureC);
    const tickState = interpretWaterProgram(pending.serialized, nextTemperatureC);
    if (tickState) setDisplayedState(tickState);
    if (rest.length === 0) {
      pendingStepsRef.current = null;
      setStepStatus('idle');
    }
  }

  useEffect(() => {
    if (!challenge) return;
    // E1 - mesmo marcador "Novo" do resto da plataforma (ver ChallengePage);
    // endpoint idempotente, falha de rede nunca trava a tela.
    apiClient.post(`/students/me/classroom-challenges/${challenge.id}/viewed`).catch(() => {});
  }, [challenge]);

  const isModify = challenge?.toolbox.stage === 'modify';
  // 3.12 (AC3) - só a fase `create` oferece a paleta completa de blocos
  // condicionais pra arrastar; `use`/`modify` nunca mostram toolbox (mesmo
  // racional de ChallengePage.tsx#isCreate: `use` é travado, `modify` só
  // edita o valor-limiar do programa já montado via applyModifyFieldLocking
  // - nenhuma das duas precisa de paleta de blocos pra isso).
  const isCreate = challenge?.toolbox.stage === 'create';

  const toolboxConfiguration = useMemo(
    () => (challenge && isCreate ? buildToolboxConfiguration(challenge.toolbox.categories) : undefined),
    [challenge, isCreate],
  );

  const initialJson = useMemo(() => {
    if (!challenge?.program) return undefined;
    return toInitialWorkspaceJson(challenge.program);
  }, [challenge]);

  const editableInitialValues = useMemo(
    () => (challenge ? extractEditableFieldValues(challenge.program, challenge.editableFields) : {}),
    [challenge],
  );

  // 3.14 (RD-I, evento `thresholdChanged`) - casado contra `editableFields`
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

  // Motor PRIMM "Predict": libera o Executar pra esta rodada. A previsão em
  // si não loga sozinha (mesmo racional de ChallengePage.handlePredict - o
  // valor entra no `water_state_prediction` de handleRun, junto do
  // resultado real); só marca o instante, pra medir a duração até Executar
  // (RD-I `predict_to_run_duration`, 3.13).
  function handlePredict(state: WaterState) {
    setPredictedState(state);
    setPrimmStage('run');
    predictedAtRef.current = Date.now();
  }

  // 3.13 (RD-I) - só quando o aluno TERMINA de mexer no slider (ver
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
    const startTemperatureC = lastRunTemperatureRef.current;
    lastRunTemperatureRef.current = temperatureC;
    animationTokenRef.current += 1;
    if (startTemperatureC === temperatureC) {
      // Nada pra percorrer - mesma temperatura de novo.
      pendingStepsRef.current = null;
      setStepStatus('idle');
      setDisplayedTemperatureC(temperatureC);
      setDisplayedState(actualState ?? displayedState);
    } else if (motionEnabled) {
      pendingStepsRef.current = null;
      setStepStatus('idle');
      void animateStateTransition(serialized, startTemperatureC, temperatureC);
    } else {
      // 3.16 AC2 - movimento reduzido: nunca pula direto pro resultado
      // final. Fica no ponto de partida e espera o aluno avançar tique a
      // tique pelo botão "Próximo passo", pra ele ver a condicional
      // decidindo no meio do caminho (ex.: gelo derretendo aos 0°C) mesmo
      // sem animação automática.
      pendingStepsRef.current = {
        serialized,
        temperatures: buildTemperatureTicks(startTemperatureC, temperatureC),
      };
      setStepStatus('stepping');
    }
    setAttempts((count) => count + 1);

    // 3.13 (RD-I) - quanto tempo o aluno levou entre confirmar a predição e
    // clicar Executar (engajamento com a hipótese, não corretude - essa
    // fica no RD-C abaixo). Só existe quando havia uma predição pendente
    // pra esta rodada (`predictedAtRef` fica `null` em desafios sem
    // `predictQuestion`, ex.: `create`).
    if (predictedAtRef.current !== null) {
      logEvent({
        studentPseudoId: user.pseudonymId,
        category: 'RD-I',
        type: 'predict_to_run_duration',
        challengeId: challenge.id,
        payload: {
          challenge_id: challenge.id,
          duration_ms: Date.now() - predictedAtRef.current,
          timestamp: new Date().toISOString(),
        },
      });
      predictedAtRef.current = null;
    }

    const matched = actualState !== null && predictedState !== null && actualState === predictedState;

    // 3.13/3.14 (RD-P) - snapshot do programa por execução, mesmo racional
    // de `program_executed` em ChallengePage. `prediction_given`/
    // `result_matched_prediction` espelham o mesmo formato opcional que
    // ChallengePage já usa (só quando havia predição pra ESTA rodada, nunca
    // na fase `modify` - lá o comparativo já sai em detalhe no
    // `challenge_modify_attempt` abaixo - e nunca em `create`, que não pede
    // predição) - o que faz `MetricsService`/`findExecutionsWithPrediction`
    // (genérico por formato de payload, não por domínio) enxergar a fase
    // Use da água do mesmo jeito que já enxerga a Geometria.
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
        ...(challenge.predictQuestion && !isModify && predictedState !== null
          ? { prediction_given: predictedState, result_matched_prediction: matched }
          : {}),
        timestamp: new Date().toISOString(),
      },
    });

    // 3.13 (RD-C) - predição declarada vs. resultado real. Só existe
    // predição em Use/Modify (`challenge.predictQuestion`); `create` nunca
    // pede uma, então nunca loga este evento (nada a comparar).
    if (challenge.predictQuestion) {
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
    }

    if (isModify) {
      const currentValues = extractEditableFieldValues(serialized, challenge.editableFields);
      const changedValues = diffChangedValues(editableInitialValues, currentValues);
      // 3.14 - mesmo evento `challenge_modify_attempt` que a Geometria já
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

    // 3.15/3.17 - desafio 2.3 (Create) não tem predição pra comparar (não
    // existe "resposta certa" fixa; o aluno monta a estrutura do zero).
    // Duas camadas de corretude coexistem aqui:
    //  1) Cobertura de estados (`water_states_coverage`, client-side, ver
    //     `evaluateWaterStatesCoverage`) - "o programa produz os 3 estados
    //     considerando toda a faixa de temperatura do slider?". Sempre
    //     calculado, é o que decide o feedback exibido na tela (nunca
    //     depende do professor ter configurado um cenário).
    //  2) Validação backend contra o "modelo esperado" (3.17,
    //     `submit-program` abaixo) - só roda quando o professor configurou
    //     um `expectedModel` pra este desafio (hoje, curado via migration).
    //     Autoridade real de corretude pro relatório do professor (nunca
    //     confiada ao frontend); resultado NUNCA volta pra esta tela - só
    //     `{ validated: boolean }`, sem nota/erro nenhuma pro aluno.
    if (isCreate) {
      apiClient
        .post(`/students/me/challenges/${challenge.id}/submit-program`, { program: serialized })
        .catch(() => {});
    }

    const coveredStates = isCreate
      ? evaluateWaterStatesCoverage(serialized, TEMPERATURE_MIN_C, TEMPERATURE_MAX_C)
      : null;
    const allStatesCovered = coveredStates !== null && coveredStates.length === ALL_WATER_STATES.length;
    if (coveredStates !== null) {
      logEvent({
        studentPseudoId: user.pseudonymId,
        category: 'RD-C',
        type: 'water_states_coverage',
        challengeId: challenge.id,
        payload: {
          challenge_id: challenge.id,
          covered_states: coveredStates,
          missing_states: ALL_WATER_STATES.filter((state) => !coveredStates.includes(state)),
          all_covered: allStatesCovered,
          timestamp: new Date().toISOString(),
        },
      });
      if (allStatesCovered) {
        // Mesmo `type`/categoria que ChallengePage usa pro Create de
        // Geometria - é o que StudentHome/HomeService já contam como
        // "desafios concluídos" desde 2.1, domínio-agnóstico por
        // `challengeId`.
        logEvent({
          studentPseudoId: user.pseudonymId,
          category: 'RD-C',
          type: 'challenge.completed',
          challengeId: challenge.id,
        });
      }
    }

    // 3.13 (AC4) - linguagem sempre descritiva, nunca "errado" (regra
    // não-negociável 4): compara o que o aluno imaginou com o que
    // aconteceu, sem avaliar a tentativa como certa/errada.
    const predictedLabel = predictedState ? STATE_LABEL[predictedState] : null;
    const feedbackSuccess = isCreate ? allStatesCovered : matched;
    setFeedback(
      isCreate
        ? {
            kind: allStatesCovered ? 'success' : 'retry',
            message: allStatesCovered
              ? resolveSuccessMessage(challenge.feedbackMessages)
              : `Seu programa ainda não mostra a água em todos os estados possíveis - faltou: ${ALL_WATER_STATES.filter(
                  (state) => !(coveredStates ?? []).includes(state),
                )
                  .map((state) => STATE_LABEL[state])
                  .join(', ')}. Que tal ajustar os limiares pra cobrir os três?`,
          }
        : matched
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
        feedback_type: feedbackSuccess ? 'success' : 'neutral',
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

    // 3.13/3.15 (RD-P + RD-C) - mesmo par de eventos `challenge_use_completed`
    // que ChallengePage já loga ao sair da fase Use (`challenge.locked`
    // aqui equivale ao `stage === 'use'` de lá). Faltava: sem isso,
    // `MetricsService`/`findUseCompletions` (genérico por TYPE de evento,
    // não por domínio) nunca via a fase Use da água como "concluída" - a
    // trilha de água ficava fora de qualquer relatório/exportação que
    // dependesse desse evento. Nunca dispara em `modify` (já tem
    // `challenge_modify_attempt` por rodada) nem em `create` (RD-C de lá é
    // `challenge.completed`, ver handleRun).
    if (challenge.locked) {
      logEvent({
        studentPseudoId: user.pseudonymId,
        category: 'RD-P',
        type: 'challenge_use_completed',
        challengeId: challenge.id,
        payload: {
          challenge_id: challenge.id,
          attempts_before_proceed: attempts,
          timestamp: new Date().toISOString(),
        },
      });
      logEvent({
        studentPseudoId: user.pseudonymId,
        category: 'RD-C',
        type: 'challenge_use_completed',
        challengeId: challenge.id,
        payload: {
          challenge_id: challenge.id,
          attempts_before_proceed: attempts,
          timestamp: new Date().toISOString(),
        },
      });
    }

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
          toolboxConfiguration={toolboxConfiguration}
          workspaceConfiguration={{
            readOnly: challenge.locked,
            trashcan: isCreate,
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
          <WaterStateTransition state={displayedState} temperatureC={displayedTemperatureC} />

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
              - mesmo padrão de ChallengePage. */}
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

          {/* 3.16 AC2 - contraparte do "Próximo passo" de ChallengePage: só
              aparece com movimento reduzido (perfil sensorial padrão) e some
              assim que a fila de temperaturas intermediárias termina. */}
          {!motionEnabled && stepStatus === 'stepping' && (
            <button
              type="button"
              className="water-challenge-page__step-button"
              onClick={handleAdvanceWaterStep}
            >
              Próximo passo →
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
