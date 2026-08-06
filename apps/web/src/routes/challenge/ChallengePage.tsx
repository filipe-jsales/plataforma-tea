import * as Blockly from 'blockly/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BlocklyWorkspace, type WorkspaceSvg } from 'react-blockly';
import { PixiTurtleWorld, type PixiTurtleWorldHandle } from '../../components/challenge/PixiTurtleWorld';
import {
  applyGenerousSnapTolerance,
  buildToolboxConfiguration,
  registerBlockDefinitions,
  type ToolboxCategory,
} from '../../lib/blocklyToolbox';
import { interpretProgram, type SerializedBlock } from '../../lib/blockProgram';
import { apiClient } from '../../lib/apiClient';
import { logEvent } from '../../lib/logEvent';
import { evaluateSquareGoal, runTurtleProgram } from '../../lib/turtleWorld';
import { useAuthStore } from '../../stores/useAuthStore';
import { useSensoryProfileStore } from '../../stores/useSensoryProfileStore';
import './ChallengePage.css';

// AC3 — tolerância ampla de encaixe. Chamado uma vez no carregamento do
// módulo (mesmo raciocínio de applyToDocument em useSensoryProfileStore.ts),
// sempre antes de qualquer workspace injetar.
applyGenerousSnapTolerance();

interface ChallengeGoal {
  shape: 'square';
  sides: number;
  turnAngleDeg: number;
}

interface ChallengeDetail {
  id: string;
  title: string;
  prompt: string;
  toolbox: { stage: string; categories: ToolboxCategory[] };
  goal: ChallengeGoal;
}

type Feedback = { kind: 'success' | 'retry'; message: string } | null;

// 3.x — editor de blocos com paleta restrita ao desafio (RQ4, regra
// não-negociável 2/3). Substitui o placeholder ModuleStub: busca o desafio
// já atribuído ao tópico, registra só os blocos da toolbox configurada
// (nunca a paleta completa do Blockly — AC1), interpreta o programa montado
// e executa no mundo PixiJS (turtleWorld.ts/blockProgram.ts fazem o cálculo
// puro, este componente só orquestra fetch/eventos/renderização).
export function ChallengePage() {
  const { topicId } = useParams<{ topicId: string }>();
  const user = useAuthStore((state) => state.user);
  const motionEnabled = useSensoryProfileStore((state) => state.motionEnabled);

  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const workspaceRef = useRef<WorkspaceSvg | null>(null);
  const pixiRef = useRef<PixiTurtleWorldHandle>(null);
  const toolboxRenderedRef = useRef(false);

  useEffect(() => {
    if (!topicId) return;
    apiClient
      .get<ChallengeDetail>(`/challenges/by-topic/${topicId}`)
      .then((detail) => {
        registerBlockDefinitions(detail.toolbox.categories);
        setChallenge(detail);
      })
      .catch(() => setNotFound(true));
  }, [topicId]);

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
    () => (challenge ? buildToolboxConfiguration(challenge.toolbox.categories) : undefined),
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

  async function handleRun() {
    const workspace = workspaceRef.current;
    if (!workspace || !challenge || !user || running) return;

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

    setRunning(true);
    setFeedback(null);
    await pixiRef.current?.playPath(result.points, { animate: motionEnabled });
    setRunning(false);

    logEvent({
      studentPseudoId: user.pseudonymId,
      category: 'RD-I',
      type: 'challenge.run_attempt',
      challengeId: challenge.id,
      payload: { success: evaluation.success },
    });

    if (evaluation.success) {
      setFeedback({ kind: 'success', message: 'Você montou o desafio! ✅' });
      logEvent({
        studentPseudoId: user.pseudonymId,
        category: 'RD-C',
        type: 'challenge.completed',
        challengeId: challenge.id,
      });
    } else {
      // Feedback reversível, nunca "errado" (regra não-negociável 4).
      setFeedback({ kind: 'retry', message: 'Quase lá — quer tentar de novo?' });
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
          workspaceConfiguration={{
            trashcan: true,
            grid: { spacing: 24, length: 3, colour: '#d7dbe0', snap: false },
            zoom: { controls: true, wheel: false, startScale: 1 },
            move: { scrollbars: true, drag: true, wheel: false },
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
          <PixiTurtleWorld ref={pixiRef} />
          <button
            type="button"
            className="challenge-page__run-button"
            onClick={handleRun}
            disabled={running}
          >
            {running ? 'Executando…' : '▶️ Executar'}
          </button>
          {feedback && (
            <p
              className={`challenge-page__feedback challenge-page__feedback--${feedback.kind}`}
            >
              {feedback.message}
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
