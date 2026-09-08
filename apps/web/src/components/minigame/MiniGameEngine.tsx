import { Application } from 'pixi.js';
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../lib/prefersReducedMotion';
import { useSensoryProfileStore } from '../../stores/useSensoryProfileStore';
import type { MiniGameStore } from '../../stores/miniGameStore';
import './MiniGameEngine.css';

const ENGINE_SIZE = 480;

// MJ2 — perfil sensorial aplicado por padrão a todo mini jogo (regra
// não-negociável 1): nasce sem som/animação a menos que o aluno tenha
// ativado explicitamente. `getSensory()` é uma leitura AO VIVO (não um
// valor congelado no mount) — uma cena de execução longa (ex.: animação de
// corte) consulta no momento de decidir animar/tocar som, então uma
// mudança de perfil no meio de uma rodada é respeitada imediatamente.
// `motionEnabled` combina o toggle da plataforma (Zustand) COM
// `prefers-reduced-motion` do SO (`lib/prefersReducedMotion.ts`) — o SO só
// pode DESLIGAR animação, nunca ligar por cima do toggle desligado; mesma
// política já aplicada a toda animação CSS em theme/sensory-theme.css,
// replicada aqui porque o canvas Pixi não é afetado por `@media
// (prefers-reduced-motion)` (isso só rege CSS).
export interface MiniGameSensoryFlags {
  motionEnabled: boolean;
  soundEnabled: boolean;
}

export interface MiniGameSceneContext {
  app: Application;
  store: MiniGameStore;
  getSensory: () => MiniGameSensoryFlags;
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

// MJ3 — extraída como função pura (testada em MiniGameEngine.spec.ts) pelo
// mesmo motivo de statistics.ts no backend: a Application Pixi real não
// inicializa em jsdom (sem canvas/WebGL), então a LÓGICA de decisão fica
// isolada do componente pra continuar testável sem precisar de um canvas de
// verdade. `null` (nenhuma cena ativa ainda, 1º mount) sempre reinicia.
export function shouldRestartScene(activeSceneId: string | null, nextSceneId: string): boolean {
  return activeSceneId !== nextSceneId;
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
        // React StrictMode (dev) monta/desmonta/remonta este efeito — a
        // limpeza da PRIMEIRA instância só resolve depois que uma SEGUNDA
        // já pode ter assumido `appRef.current` (app.init() é assíncrono).
        // Sem esta checagem, a limpeza tardia da instância descartada
        // derrubava a cena/subscrição da instância REALMENTE ativa (nula
        // `sceneCleanupRef`/`appRef` que já não eram mais dela) — sintoma:
        // o desenho inicial aparece, mas nunca mais redesenha depois de
        // qualquer atualização de store (ex.: depois de "Executar" na
        // Fábrica de Pedaços Iguais). Uma instância que nunca chegou a
        // ficar ativa só se autodestrói, sem mexer nas refs.
        if (appRef.current !== app) {
          app.destroy(true);
          return;
        }
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

      // MJ3 (AC "aluno pode reabrir o roteiro a qualquer momento sem
      // perder o progresso") — só reinicia a rodada (fase PRIMM zerada,
      // tentativas a 0) quando é de fato uma cena NOVA (sceneId diferente
      // da já ativa no store). O componente que mostra o roteiro visual
      // (MiniGameBriefing, ver MiniGamePage.tsx/FractionsGamePage.tsx)
      // desmonta/remonta este `MiniGameEngine` sem trocar `scene`/`store`
      // — sem esta checagem, cada reabertura do roteiro chamaria
      // `startScene` de novo e resetaria silenciosamente o progresso (e
      // duplicaria o evento `minigame_scene_started`, RD-P).
      if (shouldRestartScene(store.getState().activeScene?.sceneId ?? null, scene.id)) {
        store.getState().startScene(scene.id, scene.conceptId);
      }
      sceneCleanupRef.current = scene.mount({
        app,
        store,
        getSensory: () => {
          const profile = useSensoryProfileStore.getState();
          return {
            motionEnabled: profile.motionEnabled && !prefersReducedMotion(),
            soundEnabled: profile.soundEnabled,
          };
        },
      });
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
