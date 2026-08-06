import { Application, Graphics } from 'pixi.js';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Point } from '../../lib/turtleWorld';
import './PixiTurtleWorld.css';

export interface PixiTurtleWorldHandle {
  // `animate: false` desenha o caminho inteiro de uma vez (perfil sensorial
  // com motion desligado, regra não-negociável 1) — nunca decide isso
  // sozinho, ChallengePage lê useSensoryProfileStore e passa a decisão.
  playPath: (points: Point[], options: { animate: boolean }) => Promise<void>;
  reset: () => void;
}

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

// Mundo PixiJS que só desenha o caminho já calculado por turtleWorld.ts —
// nenhuma lógica de interpretação/geometria aqui, só apresentação (regra de
// separar cálculo puro de renderização, ver turtleWorld.spec.ts).
export const PixiTurtleWorld = forwardRef<PixiTurtleWorldHandle>(function PixiTurtleWorld(
  _props,
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const pathGraphicsRef = useRef<Graphics | null>(null);
  const characterRef = useRef<Graphics | null>(null);
  const readyRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let disposed = false;
    const app = new Application();
    appRef.current = app;

    readyRef.current = (async () => {
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

    return () => {
      disposed = true;
      pathGraphicsRef.current = null;
      characterRef.current = null;
      appRef.current = null;
      app.destroy(true);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    async playPath(points, options) {
      await readyRef.current;
      const pathGraphics = pathGraphicsRef.current;
      const character = characterRef.current;
      if (!pathGraphics || !character || points.length === 0) {
        return;
      }

      const origin = WORLD_SIZE / 2;
      pathGraphics.clear();
      character.position.set(origin + points[0].x, origin + points[0].y);
      character.rotation = 0;

      pathGraphics.moveTo(origin + points[0].x, origin + points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        const from = points[i - 1];
        const to = points[i];
        const headingRad = Math.atan2(to.x - from.x, -(to.y - from.y));

        if (options.animate) {
          // eslint-disable-next-line no-await-in-loop
          await sleep(SEGMENT_DURATION_MS);
        }

        character.rotation = headingRad;
        character.position.set(origin + to.x, origin + to.y);
        pathGraphics.lineTo(origin + to.x, origin + to.y);
        pathGraphics.stroke({ width: 4, color: 0x2b6cb0 });
      }
    },
    reset() {
      pathGraphicsRef.current?.clear();
      const character = characterRef.current;
      if (character) {
        character.position.set(WORLD_SIZE / 2, WORLD_SIZE / 2);
        character.rotation = 0;
      }
    },
  }));

  return (
    <div
      ref={containerRef}
      className="pixi-turtle-world"
      role="img"
      aria-label="Área onde o personagem executa o programa montado"
    />
  );
});
