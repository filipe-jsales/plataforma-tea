import * as Blockly from 'blockly/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BlocklyWorkspace, type WorkspaceSvg } from 'react-blockly';
import { PixiTurtleWorld } from '../../components/challenge/PixiTurtleWorld';
import {
  applyGenerousSnapTolerance,
  buildToolboxConfiguration,
  registerBlockDefinitions,
  type ToolboxCategory,
} from '../../lib/blocklyToolbox';
import { interpretProgram, type SerializedBlock } from '../../lib/blockProgram';
import { apiClient } from '../../lib/apiClient';
import { logEvent } from '../../lib/logEvent';
import { buildGoalPreviewPath, evaluateSquareGoal, runTurtleProgram } from '../../lib/turtleWorld';
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

interface ChallengeGoal {
  shape: 'square';
  sides: number;
  turnAngleDeg: number;
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
  nextChallengeId: string | null;
}

type Feedback = { kind: 'success' | 'retry'; message: string } | null;

function toInitialWorkspaceJson(program: SerializedBlock): object {
  return { blocks: { languageVersion: 0, blocks: [program] } };
}

// 3.1/3.2/3.3 — editor de blocos com paleta restrita (RQ4), mundo de
// execução 2D desacoplado via store (RQ1), e a fase "Use" do Desafio 1
// (observar um programa pré-montado antes de montar algo, RQ2). Duas
// entradas de rota: `/subjects/:topicId` (2.3 → aqui, sempre o Desafio 1 da
// sequência) e `/challenge/:challengeId` (acesso direto, usado pelo
// "Avançar" saindo de um desafio anterior). `challenge.locked` decide entre
// os dois modos de tela — nunca uma prop/estado inventado no frontend.
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

  const workspaceRef = useRef<WorkspaceSvg | null>(null);
  const toolboxRenderedRef = useRef(false);
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
    toolboxRenderedRef.current = false;
    executionStore.getState().reset();
    helpStore.getState().reset();

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
  }, [challenge, user]);

  const toolboxConfiguration = useMemo(
    () => (challenge && !challenge.locked ? buildToolboxConfiguration(challenge.toolbox.categories) : undefined),
    [challenge],
  );
  const initialJson = useMemo(
    () => (challenge?.locked && challenge.program ? toInitialWorkspaceJson(challenge.program) : undefined),
    [challenge],
  );

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

  function handleRun() {
    const workspace = workspaceRef.current;
    if (!workspace || !challenge || !user) return;

    const topBlock = workspace.getTopBlocks(true)[0] ?? null;
    const serialized = topBlock
      ? (Blockly.serialization.blocks.save(topBlock, {
          addInputBlocks: true,
          addNextBlocks: true,
        }) as SerializedBlock | null)
      : null;

    const actions = interpretProgram(serialized);
    const result = runTurtleProgram(actions);
    const evaluation = evaluateSquareGoal(result, challenge.goal);

    setFeedback(null);
    executionStore.getState().play(result.points, motionEnabled);
    setAttempts((count) => count + 1);

    // 3.2 — evento program_executed (RD-P): a "duração" é uma estimativa da
    // animação (ver SEGMENT_DURATION_MS acima), não uma medição real de
    // wall-clock — em modo passo-a-passo (padrão sensorial) não há duração
    // fixa, o aluno controla o ritmo, por isso 0 nesse caso.
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
        timestamp: new Date().toISOString(),
      },
    });

    // Fase "use" (Desafio 1) é só observação — o programa vem pronto e
    // sempre "funciona" por construção, não faz sentido avaliar sucesso.
    // Fase "create" (Desafio 2) é onde o feedback reversível importa de
    // verdade (regra não-negociável 4).
    if (challenge.locked) return;

    if (evaluation.success) {
      setFeedback({ kind: 'success', message: 'Você montou o desafio! ✅' });
      logEvent({
        studentPseudoId: user.pseudonymId,
        category: 'RD-C',
        type: 'challenge.completed',
        challengeId: challenge.id,
      });
    } else {
      setFeedback({ kind: 'retry', message: 'Quase lá — quer tentar de novo?' });
    }
  }

  function handleProceed() {
    if (!challenge || !user || attempts < 1) return;
    setProceeded(true);

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

  if (!challenge || !user) {
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
            trashcan: !challenge.locked,
            grid: { spacing: 24, length: 3, colour: '#d7dbe0', snap: false },
            zoom: { controls: !challenge.locked, wheel: false, startScale: 1 },
            move: { scrollbars: true, drag: !challenge.locked, wheel: false },
          }}
          onInject={(workspace) => {
            workspaceRef.current = workspace;
            workspace.addChangeListener(handleWorkspaceEvent);
          }}
          onDispose={(workspace) => {
            workspace.removeChangeListener(handleWorkspaceEvent);
          }}
        />

        <aside className="challenge-page__sidebar">
          <PixiTurtleWorld store={executionStore} />
          <button type="button" className="challenge-page__run-button" onClick={handleRun}>
            {attempts > 0 ? '🔁 Repetir execução' : '▶️ Executar'}
          </button>

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

          {!challenge.locked && (
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

          {feedback && (
            <p className={`challenge-page__feedback challenge-page__feedback--${feedback.kind}`}>
              {feedback.message}
            </p>
          )}

          {challenge.locked && attempts > 0 && (
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
