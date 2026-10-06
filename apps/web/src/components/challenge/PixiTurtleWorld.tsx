import { Application, Graphics } from 'pixi.js';
import { useEffect, useRef } from 'react';
import type { TurtleExecutionStore } from '../../stores/turtleExecutionStore';
import './PixiTurtleWorld.css';

const WORLD_SIZE = 320;
const CHARACTER_RADIUS = 12;
const SEGMENT_DURATION_MS = 260;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function drawCharacter(character: Graphics): void {
  character.clear();
  character
    .poly([0, -CHARACTER_RADIUS, CHARACTER_RADIUS * 0.8, CHARACTER_RADIUS, -CHARACTER_RADIUS * 0.8, CHARACTER_RADIUS])
    .fill({ color: 0x2b6cb0 });
}

interface PixiTurtleWorldProps {
  store: TurtleExecutionStore;
}

// Mundo PixiJS: comunicação exclusivamente via `store` (Zustand) - nunca
// importa nem manipula o DOM/instância do Blockly diretamente (3.2 AC1).
// ChallengePage calcula o caminho (blockProgram.ts + turtleWorld.ts, lógica
// pura, sem Pixi/Blockly) e chama `store.getState().play(...)`; este
// componente só reage a mudanças no store - poderia ser trocado por outro
// motor de renderização sem tocar em ChallengePage nem vice-versa.
export function PixiTurtleWorld({ store }: PixiTurtleWorldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const pathGraphicsRef = useRef<Graphics | null>(null);
  const characterRef = useRef<Graphics | null>(null);
  const readyRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let disposed = false;
    const app = new Application();
    appRef.current = app;

    // app.init() é assíncrono; em React StrictMode o efeito monta/desmonta
    // duas vezes de propósito (dev only) - se destroy() rodar antes do init
    // terminar, os plugins internos do Pixi (ex.: resize) ainda não foram
    // inicializados e destroy() quebra (`_cancelResize is not a function`).
    // Por isso o cleanup só chama destroy() depois que `ready` resolve,
    // nunca antes - `disposed` só decide se ainda vale montar o canvas.
    const ready = (async () => {
      await app.init({
        width: WORLD_SIZE,
        height: WORLD_SIZE,
        background: '#eef2f7',
        antialias: true,
      });
      if (disposed || !containerRef.current) {
        return;
      }
      containerRef.current.appendChild(app.canvas);

      const pathGraphics = new Graphics();
      app.stage.addChild(pathGraphics);
      pathGraphicsRef.current = pathGraphics;

      const character = new Graphics();
      drawCharacter(character);
      character.position.set(WORLD_SIZE / 2, WORLD_SIZE / 2);
      app.stage.addChild(character);
      characterRef.current = character;
    })();
    readyRef.current = ready;

    return () => {
      disposed = true;
      ready.then(() => {
        pathGraphicsRef.current = null;
        characterRef.current = null;
        appRef.current = null;
        app.destroy(true);
      });
    };
  }, []);

  const points = store((state) => state.points);
  const animate = store((state) => state.animate);
  const stepIndex = store((state) => state.stepIndex);
  const runToken = store((state) => state.runToken);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await readyRef.current;
      if (cancelled) return;
      const pathGraphics = pathGraphicsRef.current;
      const character = characterRef.current;
      if (!pathGraphics || !character) return;

      const origin = WORLD_SIZE / 2;
      const drawUpTo = (index: number) => {
        pathGraphics.clear();
        character.rotation = 0;
        if (points.length === 0) {
          character.position.set(origin, origin);
          return;
        }
        character.position.set(origin + points[0].x, origin + points[0].y);
        pathGraphics.moveTo(origin + points[0].x, origin + points[0].y);
        for (let i = 1; i <= index; i += 1) {
          const from = points[i - 1];
          const to = points[i];
          character.rotation = Math.atan2(to.x - from.x, -(to.y - from.y));
          character.position.set(origin + to.x, origin + to.y);
          pathGraphics.lineTo(origin + to.x, origin + to.y);
        }
        if (index > 0) {
          pathGraphics.stroke({ width: 4, color: 0x2b6cb0 });
        }
      };

      if (!animate) {
        // 3.2 AC2 - padrão sem animação: avanço por passos controlados pelo
        // aluno (advanceStep() do store, disparado por um botão "Próximo
        // passo" na tela). Este efeito só redesenha até `stepIndex`, nunca
        // avança sozinho.
        drawUpTo(stepIndex);
        return;
      }

      // animate=true (opt-in): anima segmento a segmento sozinho, sempre que
      // `runToken` mudar (nova execução). `cancelled` evita que uma
      // animação antiga continue desenhando por cima de uma nova.
      drawUpTo(0);
      for (let i = 1; i < points.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(SEGMENT_DURATION_MS);
        if (cancelled) return;
        drawUpTo(i);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runToken, stepIndex, animate]);

  return (
    <div
      ref={containerRef}
      className="pixi-turtle-world"
      role="img"
      aria-label="Área onde o personagem executa o programa montado"
    />
  );
}
