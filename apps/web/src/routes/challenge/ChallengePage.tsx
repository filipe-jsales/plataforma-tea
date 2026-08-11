import * as Blockly from 'blockly/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BlocklyWorkspace, type WorkspaceSvg } from 'react-blockly';
import { PixiTurtleWorld } from '../../components/challenge/PixiTurtleWorld';
import { InlineFeedback } from '../../components/ui';
import {
  applyGenerousSnapTolerance,
  buildToolboxConfiguration,
  registerBlockDefinitions,
  type ToolboxCategory,
} from '../../lib/blocklyToolbox';
import { interpretProgram, type SerializedBlock } from '../../lib/blockProgram';
import { apiClient } from '../../lib/apiClient';
import { diffChangedValues, extractEditableFieldValues } from '../../lib/editableFields';
import { resolveRetryMessage, resolveSuccessMessage, type ChallengeFeedbackMessages } from '../../lib/feedbackMessages';
import { logEvent } from '../../lib/logEvent';
import {
  buildGoalPreviewPath,
  closedPolygonSides,
  evaluateSquareGoal,
  runTurtleProgram,
} from '../../lib/turtleWorld';
import { createTurtleExecutionStore } from '../../stores/turtleExecutionStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSensoryProfileStore } from '../../stores/useSensoryProfileStore';
import './ChallengePage.css';

// AC3 (3.1) — tolerância ampla de encaixe. Chamado uma vez no carregamento
// do módulo (mesmo raciocínio de applyToDocument em
// useSensoryProfileStore.ts), sempre antes de qualquer workspace injetar.
applyGenerousSnapTolerance();

// Estimativa da duração da animação — PixiTurtleWorld anima 1 segmento a
// cada SEGMENT_DURATION_MS quando animate=true (ver
// components/challenge/PixiTurtleWorld.tsx, mesmo valor). Usado só pra
// popular `execution_duration_ms` no evento program_executed (3.2); em modo
// passo-a-passo (animate=false, o padrão) não existe duração fixa — o aluno
// controla o ritmo — por isso vale 0 nesse caso.
const SEGMENT_DURATION_MS = 260;

// C2 (AC1) — "a cada alteração relevante no workspace, com debounce". Um
// valor curto o bastante pra não perder muito trabalho numa queda de
// conexão, longo o bastante pra não disparar uma requisição a cada
// clique/arrasto individual.
const AUTOSAVE_DEBOUNCE_MS = 1500;
// C2 (AC5) — "tenta novamente silenciosamente sem expor erro técnico ao
// aluno". Uma única retentativa (não uma fila robusta — o próximo debounce
// tick já tenta de novo com o estado mais recente de qualquer forma, então
// uma fila persistente não agregaria nada aqui).
const AUTOSAVE_RETRY_DELAY_MS = 4000;

interface ChallengeGoal {
  shape: 'square';
  sides: number;
  turnAngleDeg: number;
  // 7.4 (AC3) — margem de erro (px) escolhida pelo professor num desafio
  // criado via template; ausente usa o default de lib/turtleWorld.ts.
  closureTolerancePx?: number;
}

// Motor PRIMM "Modify" (3.4/3.6) — um campo do `program` que o aluno pode
// editar, com os limites curados pra este desafio (ver EditableFieldConfig
// em apps/api/src/challenges/challenge-config.interface.ts, mesma forma).
interface EditableField {
  blockType: string;
  fieldName: string;
  label: string;
  min: number;
  max: number;
}

interface ChallengeDetail {
  id: string;
  title: string;
  prompt: string;
  locked: boolean;
  toolbox: { stage: string; categories: ToolboxCategory[] };
  goal: ChallengeGoal;
  program: SerializedBlock | null;
  investigationQuestion: string | null;
  predictQuestion: string | null;
  editableFields: EditableField[];
  nextChallengeId: string | null;
  // 4.2 — presente só em desafios criados via template pelo professor;
  // `null` usa o default do editor (aplicado no carregamento do módulo).
  snapTolerancePercent: number | null;
  // Tamanho dos blocos escolhido pelo professor num desafio criado via
  // template (Pequeno/Médio/Grande no formulário guiado, ver
  // challenge-config.interface.ts#blockScale no backend); `null` usa o
  // default do editor (`startScale: 1`, ver workspaceConfiguration abaixo).
  blockScale: number | null;
  // 3.7 (AC4) — mensagens de feedback customizadas pelo professor; `null`
  // (ou campo individual `null`) usa o conjunto de mensagens-padrão
  // sugeridas (ver lib/feedbackMessages.ts).
  feedbackMessages: ChallengeFeedbackMessages | null;
}

type Feedback = { kind: 'success' | 'retry'; message: string } | null;

// Motor PRIMM "Predict" (3.6): só 2 estágios são alcançáveis dentro desta
// tela (ver a nota de pesquisa "motor PRIMM" em challenge-config.interface.ts
// pra onde os outros 3 — Run/Investigate/Make — vivem na sequência) —
// 'predict' trava o botão Executar até o aluno responder a
// `challenge.predictQuestion`; volta pra 'predict' depois de cada execução,
// porque os valores editáveis podem ter mudado desde a última previsão.
type PrimmStage = 'predict' | 'run';

interface ModifyResult {
  predictedSides: number | null;
  actualSides: number | null;
  matched: boolean;
}

function toInitialWorkspaceJson(program: SerializedBlock): object {
  return { blocks: { languageVersion: 0, blocks: [program] } };
}

// Motor PRIMM "Modify": trava a estrutura do programa (bloco não pode ser
// movido/apagado) e o valor de todo campo que não está em `editableFields` —
// só os campos configurados pro desafio aceitam edição, e com o min/max
// definidos ali (não o min/max técnico do bloco em si, ver migration
// AddAngleFieldToTurnBlock). Chamado uma vez no `onInject` do workspace.
function applyModifyFieldLocking(workspace: WorkspaceSvg, editableFields: EditableField[]): void {
  for (const block of workspace.getAllBlocks(false)) {
    block.setMovable(false);
    block.setDeletable(false);

    const editableForBlock = editableFields.filter((field) => field.blockType === block.type);
    for (const input of block.inputList) {
      for (const field of input.fieldRow) {
        if (!field.name) continue;
        const spec = editableForBlock.find((candidate) => candidate.fieldName === field.name);
        if (!spec) {
          field.setEnabled(false);
          continue;
        }
        field.setEnabled(true);
        if (field instanceof Blockly.FieldNumber) {
          field.setConstraints(spec.min, spec.max, undefined);
        }
      }
    }
  }
}

// 3.1/3.2/3.3/3.4 — editor de blocos com paleta restrita (RQ4), mundo de
// execução 2D desacoplado via store (RQ1), e as 3 fases Use-Modify-Create
// (RQ2) de um tópico, cada uma com seu próprio subconjunto do motor PRIMM
// (ver a nota de pesquisa "motor PRIMM" em
// apps/api/src/challenges/challenge-config.interface.ts): `use` é
// Predict-ausente/Run/Investigate (travado), `modify` é Predict/Run em loop
// sobre campos editáveis, `create` é só Make (editor livre). Duas entradas
// de rota: `/subjects/:topicId` (2.3 → aqui, sempre o Desafio 1 da
// sequência) e `/challenge/:challengeId` (acesso direto, usado pelo
// "Avançar" saindo de um desafio anterior). `challenge.toolbox.stage` (não
// `locked` — esse só descreve o Blockly `readOnly`) decide entre os 3 modos
// de tela — nunca uma prop/estado inventado no frontend.
export function ChallengePage() {
  const { topicId, challengeId } = useParams<{ topicId?: string; challengeId?: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const motionEnabled = useSensoryProfileStore((state) => state.motionEnabled);

  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [attempts, setAttempts] = useState(0);
  const [investigationAnswer, setInvestigationAnswer] = useState('');
  const [proceeded, setProceeded] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [primmStage, setPrimmStage] = useState<PrimmStage>('predict');
  const [predictAnswer, setPredictAnswer] = useState<number | null>(null);
  const [modifyResult, setModifyResult] = useState<ModifyResult | null>(null);
  // C2 — rascunho salvo do workspace (autosave). `draftLoaded` atrasa a
  // primeira renderização do editor até sabermos se existe rascunho pra
  // restaurar — nunca monta com o programa curricular pra só depois trocar
  // pelo rascunho (isso reiniciaria o Blockly de forma perceptível).
  const [draftJson, setDraftJson] = useState<SerializedBlock | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const workspaceRef = useRef<WorkspaceSvg | null>(null);
  const toolboxRenderedRef = useRef(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const executionStore = useMemo(() => createTurtleExecutionStore(), []);
  const helpStore = useMemo(() => createTurtleExecutionStore(), []);
  const executionStatus = executionStore((state) => state.status);

  useEffect(() => {
    setChallenge(null);
    setNotFound(false);
    setFeedback(null);
    setAttempts(0);
    setInvestigationAnswer('');
    setProceeded(false);
    setHelpOpen(false);
    setPrimmStage('predict');
    setPredictAnswer(null);
    setModifyResult(null);
    setDraftJson(null);
    setDraftLoaded(false);
    toolboxRenderedRef.current = false;
    executionStore.getState().reset();
    helpStore.getState().reset();
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    if (autosaveRetryTimerRef.current) clearTimeout(autosaveRetryTimerRef.current);

    const path = topicId ? `/challenges/by-topic/${topicId}` : `/challenges/${challengeId}`;
    apiClient
      .get<ChallengeDetail>(path)
      .then((detail) => {
        registerBlockDefinitions(detail.toolbox.categories);
        setChallenge(detail);
      })
      .catch(() => setNotFound(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, challengeId]);

  useEffect(() => {
    if (!challenge || !user || toolboxRenderedRef.current) return;
    toolboxRenderedRef.current = true;
    const availableBlockIds = challenge.toolbox.categories.flatMap((category) =>
      category.blocks.map((block) => block.blockType),
    );
    logEvent({
      studentPseudoId: user.pseudonymId,
      category: 'RD-I',
      type: 'toolbox_rendered',
      challengeId: challenge.id,
      payload: {
        challenge_id: challenge.id,
        available_block_ids: availableBlockIds,
        timestamp: new Date().toISOString(),
      },
    });
    // E1 (AC2) — "o marcador de novo é removido automaticamente, sem
    // exigir ação extra" — chamado sempre que o desafio abre (não só o
    // primeiro, o backend já é idempotente), silencioso: falha de rede
    // aqui nunca deve impedir o aluno de usar o desafio.
    apiClient.post(`/students/me/classroom-challenges/${challenge.id}/viewed`).catch(() => {});
  }, [challenge, user]);

  // C2 (AC2) — busca o rascunho salvo assim que o desafio carrega, pra
  // restaurar "exatamente no estado salvo mais recente". Fase `use` é
  // sempre travada (readOnly, nunca editada) — nem faz a chamada, autosave
  // não faz sentido ali. Falha de rede aqui cai pro programa curricular
  // (nunca trava a tela por causa disso).
  useEffect(() => {
    if (!challenge) return;
    if (challenge.locked) {
      setDraftJson(null);
      setDraftLoaded(true);
      return;
    }
    setDraftLoaded(false);
    apiClient
      .get<{ workspaceJson: SerializedBlock | null }>(
        `/students/me/challenges/${challenge.id}/draft`,
      )
      .then((response) => setDraftJson(response.workspaceJson))
      .catch(() => setDraftJson(null))
      .finally(() => setDraftLoaded(true));
  }, [challenge]);

  // Só a fase `create` (Make) oferece paleta de blocos nova pra arrastar —
  // `use` é travado, `modify` edita campos de um programa fixo, nenhuma das
  // duas mostra toolbox (nunca inferido de `locked`, que hoje só descreve o
  // Blockly `readOnly`).
  const isModify = challenge?.toolbox.stage === 'modify';
  const isCreate = challenge?.toolbox.stage === 'create';

  const toolboxConfiguration = useMemo(
    () => (challenge && isCreate ? buildToolboxConfiguration(challenge.toolbox.categories) : undefined),
    [challenge, isCreate],
  );
  // `program` só existe em `use`/`modify` — não depende de `locked`. C2: um
  // rascunho salvo (fase não travada) tem prioridade sobre o `program`
  // curricular — ele representa progresso MAIS recente do aluno; `use` é
  // sempre travado, então `draftJson` nunca é populado ali (ver efeito
  // acima).
  const initialJson = useMemo(() => {
    if (!challenge) return undefined;
    const effectiveProgram =
      !challenge.locked && draftJson ? draftJson : challenge.program;
    return effectiveProgram ? toInitialWorkspaceJson(effectiveProgram) : undefined;
  }, [challenge, draftJson]);
  // Snapshot dos valores originais dos campos editáveis (fase `modify`),
  // calculado uma vez a partir do `program` pré-montado — comparado contra o
  // valor atual a cada Executar pra montar `changed_values` do evento
  // challenge_modify_attempt (ver lib/editableFields.ts).
  const editableInitialValues = useMemo(
    () => (challenge ? extractEditableFieldValues(challenge.program, challenge.editableFields) : {}),
    [challenge],
  );
  // Opções de previsão (motor PRIMM "Predict"): quantos lados a figura vai
  // ter. Os limites vêm do campo editável TIMES (é ele que decide o número
  // de lados neste desafio) — nunca hardcoded, mas acoplado de propósito ao
  // domínio deste desafio específico (repetir+girar desenha um polígono
  // regular). Cai em 3–8 se o desafio não declarar TIMES como editável.
  const predictOptions = useMemo(() => {
    const timesField = challenge?.editableFields.find((field) => field.fieldName === 'TIMES');
    const min = timesField?.min ?? 3;
    const max = timesField?.max ?? 8;
    return Array.from({ length: Math.max(max - min + 1, 0) }, (_, index) => min + index);
  }, [challenge]);

  function handleWorkspaceEvent(event: Blockly.Events.Abstract) {
    if (!(event instanceof Blockly.Events.BlockDrag) || event.isStart || !event.blockId) {
      return;
    }
    const block = workspaceRef.current?.getBlockById(event.blockId);
    if (!block || !user || !challenge) return;

    const successDrop = Boolean(
      block.previousConnection?.isConnected() || block.outputConnection?.isConnected(),
    );
    logEvent({
      studentPseudoId: user.pseudonymId,
      category: 'RD-I',
      type: 'block_dragged',
      challengeId: challenge.id,
      payload: {
        block_type: block.type,
        success_drop: successDrop,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // C2 (AC4) — invisível ao aluno por padrão: nenhum estado/UI de "salvando…"
  // é criado aqui, o autosave nunca aparece na tela. (AC5) — falha de rede
  // tenta de novo em silêncio, uma vez, sem lançar/expor o erro.
  function saveDraftSilently(serialized: SerializedBlock | null) {
    if (!challenge) return;
    const challengeId = challenge.id;
    apiClient
      .patch(`/students/me/challenges/${challengeId}/draft`, { workspaceJson: serialized })
      .then(() => {
        if (!user) return;
        logEvent({
          studentPseudoId: user.pseudonymId,
          category: 'RD-P',
          type: 'workspace_autosaved',
          challengeId,
          payload: {
            challenge_id: challengeId,
            block_sequence_json: serialized,
            timestamp: new Date().toISOString(),
          },
        });
      })
      .catch(() => {
        if (autosaveRetryTimerRef.current) clearTimeout(autosaveRetryTimerRef.current);
        autosaveRetryTimerRef.current = setTimeout(() => {
          apiClient
            .patch(`/students/me/challenges/${challengeId}/draft`, { workspaceJson: serialized })
            .catch(() => {
              // Silencioso de propósito (AC5) — o próximo tick de debounce
              // (nova alteração no workspace) já tenta salvar de novo com o
              // estado mais recente; uma fila de retentativa persistente não
              // agregaria nada aqui.
            });
        }, AUTOSAVE_RETRY_DELAY_MS);
      });
  }

  // AC1 — só eventos que mudam o CONTEÚDO do workspace disparam autosave
  // (criar/apagar/mover/alterar bloco) — nunca eventos de UI (seleção,
  // clique, scroll), que o addChangeListener também emite.
  function handleWorkspaceAutosave(event: Blockly.Events.Abstract) {
    if (!challenge || challenge.locked) return;
    const isContentChange =
      event instanceof Blockly.Events.BlockCreate ||
      event instanceof Blockly.Events.BlockDelete ||
      event instanceof Blockly.Events.BlockChange ||
      event instanceof Blockly.Events.BlockMove;
    if (!isContentChange) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      const workspace = workspaceRef.current;
      if (!workspace) return;
      const topBlock = workspace.getTopBlocks(true)[0] ?? null;
      const serialized = topBlock
        ? (Blockly.serialization.blocks.save(topBlock, {
            addInputBlocks: true,
            addNextBlocks: true,
          }) as SerializedBlock | null)
        : null;
      saveDraftSilently(serialized);
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  // AC3 — consolida/descarta o rascunho na submissão final, pra não deixar
  // um autosave intermediário conflitando com o resultado já concluído.
  // Fire-and-forget (silencioso, mesmo racional de saveDraftSilently): uma
  // falha aqui não é grave — o pior caso é o rascunho reaparecer, o que o
  // aluno já resolveu construindo de novo.
  function discardDraftSilently() {
    if (!challenge) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    apiClient.delete(`/students/me/challenges/${challenge.id}/draft`).catch(() => {});
  }

  // Motor PRIMM "Predict" (3.6): resposta é uma ação explícita do aluno
  // (clique num botão de opção), nunca avança sozinha — libera o Executar
  // pra esta rodada. Não loga por si só: a previsão entra no mesmo evento
  // `challenge_modify_attempt` que o resultado da execução, pra manter as
  // duas coisas juntas numa única unidade logável (ver handleRun).
  function handlePredict(sides: number) {
    setPredictAnswer(sides);
    setPrimmStage('run');
  }

  function handleRun() {
    const workspace = workspaceRef.current;
    if (!workspace || !challenge || !user) return;
    // AC de 3.4: a pergunta de predição aparece antes de CADA execução — se
    // o desafio declara `predictQuestion` e o aluno ainda não respondeu
    // pra esta rodada, Executar não faz nada (o botão nem aparece nesse
    // estado, ver JSX — isto é defesa em profundidade).
    if (challenge.predictQuestion && predictAnswer === null) return;

    const topBlock = workspace.getTopBlocks(true)[0] ?? null;
    const serialized = topBlock
      ? (Blockly.serialization.blocks.save(topBlock, {
          addInputBlocks: true,
          addNextBlocks: true,
        }) as SerializedBlock | null)
      : null;

    const actions = interpretProgram(serialized);
    const result = runTurtleProgram(actions);
    // 7.4 (AC3) — margem de erro por-desafio (ausente usa o default do
    // motor, ver lib/turtleWorld.ts), a mesma nos dois cálculos abaixo.
    const evaluation = evaluateSquareGoal(result, challenge.goal, challenge.goal.closureTolerancePx);
    // Motor PRIMM "Predict": quantos lados o traçado realmente fechou com —
    // calculado uma vez, reusado tanto pelo comparativo de 3.3 (abaixo, só
    // no `program_executed`) quanto pelo de 3.4 (challenge_modify_attempt).
    const actualSides = closedPolygonSides(result, challenge.goal.closureTolerancePx);

    setFeedback(null);
    executionStore.getState().play(result.points, motionEnabled);
    setAttempts((count) => count + 1);

    // 3.2 — evento program_executed (RD-P): a "duração" é uma estimativa da
    // animação (ver SEGMENT_DURATION_MS acima), não uma medição real de
    // wall-clock — em modo passo-a-passo (padrão sensorial) não há duração
    // fixa, o aluno controla o ritmo, por isso 0 nesse caso.
    //
    // `prediction_given`/`result_matched_prediction` só aparecem quando o
    // desafio pede previsão E não é a fase `modify` — lá o comparativo já
    // sai em detalhe no `challenge_modify_attempt` logo abaixo, duplicar
    // aqui não agrega. Em 3.3 a previsão só é pedida antes da 1ª execução
    // (`predictAnswer` fica com o mesmo valor nas reexecuções seguintes,
    // já que o programa nunca muda ali — repetir o comparativo a cada
    // `program_executed` é intencional, não um bug de estado não-limpo).
    logEvent({
      studentPseudoId: user.pseudonymId,
      category: 'RD-P',
      type: 'program_executed',
      challengeId: challenge.id,
      payload: {
        challenge_id: challenge.id,
        block_sequence_json: serialized,
        execution_duration_ms: motionEnabled
          ? Math.max(result.points.length - 1, 0) * SEGMENT_DURATION_MS
          : 0,
        ...(challenge.predictQuestion && !isModify && predictAnswer !== null
          ? {
              prediction_given: predictAnswer,
              result_matched_prediction: actualSides === predictAnswer,
            }
          : {}),
        timestamp: new Date().toISOString(),
      },
    });

    // Motor PRIMM "Modify" (3.4): sem avaliação de sucesso/fracasso, mesmo
    // racional da fase "use" logo abaixo — o objetivo é explorar o efeito
    // de mudar TIMES/ANGLE, não bater uma meta fixa. `challenge_modify_
    // attempt` é o log estruturado (RD-P) da rodada: quais valores mudaram
    // desde o início, o que o aluno previu, e se bateu com o resultado real
    // — a reflexão que aparece na tela é só descritiva, nunca "certo/errado".
    if (isModify) {
      const currentValues = extractEditableFieldValues(serialized, challenge.editableFields);
      const changedValues = diffChangedValues(editableInitialValues, currentValues);
      const matched = actualSides !== null && actualSides === predictAnswer;

      logEvent({
        studentPseudoId: user.pseudonymId,
        category: 'RD-P',
        type: 'challenge_modify_attempt',
        challengeId: challenge.id,
        payload: {
          challenge_id: challenge.id,
          changed_values: changedValues,
          prediction_given: predictAnswer,
          result_matched_prediction: matched,
          timestamp: new Date().toISOString(),
        },
      });

      setModifyResult({ predictedSides: predictAnswer, actualSides, matched });
      setPredictAnswer(null);
      // Volta pra "predict" só se o desafio de fato usa essa pergunta —
      // nunca hardcoded a `isModify`, sempre a partir da config (AC4 3.6).
      if (challenge.predictQuestion) {
        setPrimmStage('predict');
      }
      // 3.7 (AC6/feedback_shown) — a reflexão da fase Modify também passa
      // pelo componente de feedback reutilizável (ver JSX abaixo), então
      // também emite o mesmo evento que Use/Create — "fechou" é o sinal
      // mais próximo de "sucesso" que esta fase exploratória tem, nunca
      // comparado à previsão do aluno (regra não-negociável 5).
      logEvent({
        studentPseudoId: user.pseudonymId,
        category: 'RD-I',
        type: 'feedback_shown',
        challengeId: challenge.id,
        payload: {
          challenge_id: challenge.id,
          feedback_type: actualSides !== null ? 'success' : 'neutral',
          stage: challenge.toolbox.stage,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Fase "use" (Desafio 1) é só observação — o programa vem pronto e
    // sempre "funciona" por construção, não faz sentido avaliar sucesso.
    // Fase "create" (Desafio 2/4) é onde o feedback reversível importa de
    // verdade (regra não-negociável 4).
    if (challenge.locked) return;

    // 3.7 (AC4) — mensagem configurável pelo professor por desafio, com
    // fallback pro conjunto de mensagens-padrão sugeridas (lib/
    // feedbackMessages.ts) quando o professor não personaliza.
    const feedbackType: 'success' | 'neutral' = evaluation.success ? 'success' : 'neutral';
    setFeedback(
      evaluation.success
        ? { kind: 'success', message: resolveSuccessMessage(challenge.feedbackMessages) }
        : { kind: 'retry', message: resolveRetryMessage(challenge.feedbackMessages) },
    );
    logEvent({
      studentPseudoId: user.pseudonymId,
      category: 'RD-I',
      type: 'feedback_shown',
      challengeId: challenge.id,
      payload: {
        challenge_id: challenge.id,
        feedback_type: feedbackType,
        stage: challenge.toolbox.stage,
        timestamp: new Date().toISOString(),
      },
    });
    if (evaluation.success) {
      logEvent({
        studentPseudoId: user.pseudonymId,
        category: 'RD-C',
        type: 'challenge.completed',
        challengeId: challenge.id,
      });
      // C2 (AC3) — desafio concluído e submetido: o autosave intermediário
      // não deve sobrar conflitando com o resultado final.
      discardDraftSilently();
    }
  }

  function handleProceed() {
    if (!challenge || !user || attempts < 1) return;
    setProceeded(true);

    // `challenge_use_completed` é específico da fase "use" (3.3) — a fase
    // "modify" já loga cada rodada via `challenge_modify_attempt` em
    // handleRun, não precisa de um evento de conclusão próprio (nada no
    // backlog de 3.4 pede isso; não inventar um).
    if (challenge.locked) {
      logEvent({
        studentPseudoId: user.pseudonymId,
        category: 'RD-P',
        type: 'challenge_use_completed',
        challengeId: challenge.id,
        payload: {
          challenge_id: challenge.id,
          attempts_before_proceed: attempts,
          investigation_answer: investigationAnswer || null,
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

    if (challenge.nextChallengeId) {
      navigate(`/challenge/${challenge.nextChallengeId}`);
    }
  }

  function handleHelp() {
    if (!challenge) return;
    setHelpOpen(true);
    const preview = buildGoalPreviewPath(challenge.goal);
    helpStore.getState().play(preview.points, motionEnabled);
    if (user) {
      logEvent({
        studentPseudoId: user.pseudonymId,
        category: 'RD-I',
        type: 'challenge.help_viewed',
        challengeId: challenge.id,
      });
    }
  }

  if (notFound) {
    return (
      <main className="challenge-page">
        <p>Este módulo ainda não tem um desafio disponível.</p>
        <Link to="/subjects">Voltar</Link>
      </main>
    );
  }

  // C2 — espera o rascunho carregar antes de montar o editor pela primeira
  // vez (nunca monta com o programa curricular pra só depois trocar pelo
  // rascunho) — mesma tela em branco que `!challenge` já mostra, nenhum
  // indicador novo (AC4: autosave invisível por padrão).
  if (!challenge || !user || !draftLoaded) {
    return null;
  }

  return (
    <main className="challenge-page">
      <Link to="/subjects" className="challenge-page__back-link">
        ← Voltar
      </Link>
      <h1>{challenge.title}</h1>
      <p className="challenge-page__prompt">{challenge.prompt}</p>

      <div className="challenge-page__layout">
        <BlocklyWorkspace
          key={challenge.id}
          className="challenge-page__editor"
          toolboxConfiguration={toolboxConfiguration}
          initialJson={initialJson}
          workspaceConfiguration={{
            readOnly: challenge.locked,
            // Trashcan/paleta só fazem sentido quando dá pra apagar/adicionar
            // bloco de verdade — fase "modify" trava a estrutura (ver
            // applyModifyFieldLocking), então nenhuma das duas aparece lá.
            trashcan: isCreate,
            grid: { spacing: 24, length: 3, colour: '#d7dbe0', snap: false },
            zoom: { controls: !challenge.locked, wheel: false, startScale: challenge.blockScale ?? 1 },
            move: { scrollbars: true, drag: !challenge.locked, wheel: false },
          }}
          onInject={(workspace) => {
            workspaceRef.current = workspace;
            workspace.addChangeListener(handleWorkspaceEvent);
            // C2 — autosave só faz sentido onde o aluno pode editar; `use`
            // é sempre readOnly (ver workspaceConfiguration acima).
            if (!challenge.locked) {
              workspace.addChangeListener(handleWorkspaceAutosave);
            }
            // 4.2 — reaplica a tolerância de encaixe pra ESTE desafio
            // específico: default (100%) pro currículo semeado, ou o valor
            // que o professor escolheu no formulário guiado ao criar um
            // desafio via template (Blockly.config é estado global, não
            // por-workspace, ver blocklyToolbox.ts).
            applyGenerousSnapTolerance(challenge.snapTolerancePercent ?? undefined);
            if (isModify) {
              applyModifyFieldLocking(workspace, challenge.editableFields);
            }
          }}
          onDispose={(workspace) => {
            workspace.removeChangeListener(handleWorkspaceEvent);
            workspace.removeChangeListener(handleWorkspaceAutosave);
            if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
            if (autosaveRetryTimerRef.current) clearTimeout(autosaveRetryTimerRef.current);
          }}
        />

        <aside className="challenge-page__sidebar">
          <PixiTurtleWorld store={executionStore} />

          {/* Motor PRIMM "Predict" (3.6): quando o desafio declara
              predictQuestion (hoje só "modify") e o aluno ainda não
              respondeu pra esta rodada, o botão Executar nem aparece —
              a previsão é sempre a primeira ação disponível, nunca uma
              etapa que dá pra pular. */}
          {challenge.predictQuestion && primmStage === 'predict' ? (
            <div className="challenge-page__predict">
              <p>{challenge.predictQuestion}</p>
              <div className="challenge-page__predict-options">
                {predictOptions.map((sides) => (
                  <button
                    key={sides}
                    type="button"
                    className="challenge-page__predict-option"
                    onClick={() => handlePredict(sides)}
                  >
                    {sides}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button type="button" className="challenge-page__run-button" onClick={handleRun}>
              {attempts > 0 ? '🔁 Repetir execução' : '▶️ Executar'}
            </button>
          )}

          {/* 3.2 AC2 — padrão sensorial sem animação: o aluno controla o
              ritmo passo a passo, nunca um avanço automático. Só aparece
              depois de rodar (nada pra avançar antes disso) e some quando o
              caminho termina (status volta a 'idle'). */}
          {!motionEnabled && executionStatus === 'stepping' && (
            <button
              type="button"
              className="challenge-page__step-button"
              onClick={() => executionStore.getState().advanceStep()}
            >
              Próximo passo →
            </button>
          )}

          {/* Botão de Ajuda mostra a forma-ALVO escondida — só faz sentido na
              fase "create" (Desafio 2/4); na fase "modify" o aluno já vê e
              controla a forma diretamente, não há alvo escondido pra
              revelar. */}
          {isCreate && (
            <>
              <button type="button" className="challenge-page__help-button" onClick={handleHelp}>
                🔎 Ajuda: ver a forma
              </button>
              {helpOpen && (
                <div className="challenge-page__help-panel">
                  <p>
                    É essa a forma que você precisa montar — mas os blocos que fazem isso
                    acontecer são com você.
                  </p>
                  <PixiTurtleWorld store={helpStore} />
                </div>
              )}
            </>
          )}

          {/* 3.7 (AC3/AC6) — mesmo componente reutilizável (icone + texto,
              nunca só cor) usado nas 3 fases (3.3/3.4/3.5): aqui cobre
              Use/Create; a reflexão da fase Modify logo abaixo usa o
              mesmo InlineFeedback, só com texto composto dinamicamente. */}
          {feedback && <InlineFeedback kind={feedback.kind}>{feedback.message}</InlineFeedback>}

          {/* Reflexão da fase "modify": só descreve o que aconteceu (o que o
              aluno previu vs. o que a figura fez), nunca "certo/errado" —
              regra não-negociável 4. O log de verdade (challenge_modify_
              attempt) já saiu em handleRun; isto é só o que aparece na tela. */}
          {isModify && modifyResult && (
            <InlineFeedback kind={modifyResult.actualSides !== null ? 'success' : 'retry'}>
              Você imaginou {modifyResult.predictedSides} lados.{' '}
              {modifyResult.actualSides
                ? `A figura fechou com ${modifyResult.actualSides} lados.`
                : 'Essa figura não fechou — quer tentar outros valores?'}
            </InlineFeedback>
          )}

          {(challenge.locked || isModify) && attempts > 0 && (
            <div className="challenge-page__investigation">
              {challenge.investigationQuestion && (
                <>
                  <label htmlFor="investigation-answer">{challenge.investigationQuestion}</label>
                  <textarea
                    id="investigation-answer"
                    value={investigationAnswer}
                    onChange={(event) => setInvestigationAnswer(event.target.value)}
                    rows={2}
                  />
                </>
              )}
              <button
                type="button"
                className="challenge-page__proceed-button"
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
