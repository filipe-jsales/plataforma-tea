import { Application } from 'pixi.js';
import { useEffect, useRef } from 'react';
import type { MiniGameStore } from '../../stores/miniGameStore';
import './MiniGameEngine.css';

const ENGINE_SIZE = 480;

export interface MiniGameSceneContext {
  app: Application;
  store: MiniGameStore;
}

// MJ1 — contrato que toda cena de mini jogo implementa: recebe a
// Application Pixi já pronta + o store da rodada atual, monta seu próprio
// conteúdo no stage, e devolve uma função de limpeza. O motor
// (MiniGameEngine) nunca conhece o CONTEÚDO de uma cena — só chama
// `mount`/limpa o retorno, mesmo desacoplamento de PixiTurtleWorld em
// relação ao programa de blocos que desenha.
export interface MiniGameSceneDefinition {
  id: string;
  conceptId: string;
  mount(context: MiniGameSceneContext): () => void;
}

interface MiniGameEngineProps {
  store: MiniGameStore;
  scene: MiniGameSceneDefinition;
}

// MJ1 — motor base de mini jogos sérios (2ª metodologia ativa, RQ1
// 39,13%). PixiJS, não Phaser (ver nota de decisão de arquitetura em
// docs/ai/backlog/mini-jogos-serios.md) — mesmo motor 2D já em produção
// via PixiTurtleWorld.tsx, evitando duas stacks de renderização.
//
// Comunicação exclusivamente via `store` (Zustand), igual a
// PixiTurtleWorld: este componente nunca importa nada de domínio
// específico de um mini jogo, só a `scene` que lhe é passada — trocar de
// cena é só trocar essa prop.
//
// "Uma única cena carregada por vez" (AC de MJ1): o efeito que monta a
// cena SEMPRE limpa a cena anterior (`sceneCleanupRef.current?.()` +
// `app.stage.removeChildren()`) antes de montar a nova — nunca duas cenas
// coexistindo no mesmo stage, mesmo se `scene` mudar rapidamente.
export function MiniGameEngine({ store, scene }: MiniGameEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const readyRef = useRef<Promise<void> | null>(null);
  const sceneCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let disposed = false;
    const app = new Application();
    appRef.current = app;

    // app.init() é assíncrono; em React StrictMode o efeito monta/desmonta
    // duas vezes de propósito (dev only) — mesmo cuidado de
    // PixiTurtleWorld: destroy() só roda depois que `ready` resolve.
    const ready = (async () => {
      await app.init({
        width: ENGINE_SIZE,
        height: ENGINE_SIZE,
        background: '#eef2f7',
        antialias: true,
      });
      if (disposed || !containerRef.current) {
        return;
      }
      containerRef.current.appendChild(app.canvas);
    })();
    readyRef.current = ready;

    return () => {
      disposed = true;
      ready.then(() => {
        sceneCleanupRef.current?.();
        sceneCleanupRef.current = null;
        appRef.current = null;
        app.destroy(true);
      });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await readyRef.current;
      if (cancelled) return;
      const app = appRef.current;
      if (!app) return;

      // Cena anterior (se houver) sempre sai antes da nova entrar — ver
      // comentário da função acima.
      sceneCleanupRef.current?.();
      app.stage.removeChildren();

      store.getState().startScene(scene.id, scene.conceptId);
      sceneCleanupRef.current = scene.mount({ app, store });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, store]);

  return (
    <div
      ref={containerRef}
      className="mini-game-engine"
      role="img"
      aria-label="Área do mini jogo"
    />
  );
}
