import { Graphics, Text } from 'pixi.js';
import type { FractionsRoundStore } from '../../../stores/fractionsRoundStore';
import type { MiniGameSceneDefinition } from '../MiniGameEngine';

const THEME_COLOUR: Record<string, number> = {
  chocolate_bar: 0x8b5a2b,
  pizza: 0xe07a1f,
  garden: 0x2f9e44,
};

const THEME_ICON: Record<string, string> = {
  chocolate_bar: '🍫',
  pizza: '🍕',
  garden: '🌱',
};

const STRIP_WIDTH = 380;
const STRIP_HEIGHT = 140;
const STRIP_GAP = 4;

// Geometria deliberadamente IGUAL pros 3 temas (barra/pizza/jardim) - só
// cor + ícone mudam. Ver docs/ai/backlog/mini-jogo-fabrica-pedacos-iguais.md
// ("Riscos e trade-offs"): o próprio design original alerta que um corte
// "quase igual" mal desenhado pode confundir mais que ensinar - uma faixa
// de retângulos iguais é a forma mais inequívoca de mostrar "partes
// iguais", então este MVP usa a mesma geometria pros 3 temas em vez de
// arriscar uma forma (fatia de pizza, grade de jardim) que fique
// visualmente desigual por imprecisão de desenho.
export function createFractionsFactoryScene(
  roundStore: FractionsRoundStore,
  theme: string,
  conceptId: string,
): MiniGameSceneDefinition {
  const colour = THEME_COLOUR[theme] ?? THEME_COLOUR.chocolate_bar;
  const icon = THEME_ICON[theme] ?? THEME_ICON.chocolate_bar;

  return {
    id: `fractions-factory:${theme}`,
    conceptId,
    mount({ app, getSensory }) {
      const origin = { x: app.screen.width / 2, y: app.screen.height / 2 };

      const label = new Text({
        text: `${icon} Inteiro ainda não cortado`,
        style: { fill: 0x1a1a1a, fontSize: 16, fontWeight: '600', align: 'center' },
      });
      label.anchor.set(0.5);
      label.position.set(origin.x, origin.y - STRIP_HEIGHT / 2 - 40);
      app.stage.addChild(label);

      const stripsContainer = new Graphics();
      app.stage.addChild(stripsContainer);

      function draw() {
        const { totalParts, deliveredParts, executed } = roundStore.getState();
        stripsContainer.removeChildren();
        stripsContainer.clear();

        if (!executed || !totalParts) {
          // Inteiro intacto, ainda sem cortes - só o contorno.
          stripsContainer
            .roundRect(
              origin.x - STRIP_WIDTH / 2,
              origin.y - STRIP_HEIGHT / 2,
              STRIP_WIDTH,
              STRIP_HEIGHT,
              8,
            )
            .fill({ color: colour, alpha: 0.25 })
            .stroke({ width: 2, color: colour });
          label.text = `${icon} Inteiro ainda não cortado`;
          return;
        }

        const partWidth = (STRIP_WIDTH - STRIP_GAP * (totalParts - 1)) / totalParts;
        for (let i = 0; i < totalParts; i += 1) {
          const delivered = deliveredParts !== null && i < deliveredParts;
          const x = origin.x - STRIP_WIDTH / 2 + i * (partWidth + STRIP_GAP);
          const y = origin.y - STRIP_HEIGHT / 2;
          stripsContainer
            .roundRect(x, y, partWidth, STRIP_HEIGHT, 6)
            .fill({ color: colour, alpha: delivered ? 1 : 0.2 })
            .stroke({ width: 2, color: colour });

          // MJ5 - rotulagem redundante: peça entregue nunca é comunicada só
          // por cor/opacidade, sempre com um ícone de check também.
          if (delivered) {
            const check = new Text({
              text: '✓',
              style: { fill: 0xffffff, fontSize: 18, fontWeight: '700' },
            });
            check.anchor.set(0.5);
            check.position.set(x + partWidth / 2, origin.y);
            stripsContainer.addChild(check);
          }
        }

        label.text = `${icon} ${totalParts} pedaços iguais - ${deliveredParts ?? 0} entregue(s)`;
      }

      // MJ2 - anima só se o perfil sensorial permitir (motionEnabled); caso
      // contrário desenha o estado final direto, sem transição.
      let flashTicker: (() => void) | null = null;
      function drawWithOptionalFlash() {
        const { motionEnabled } = getSensory();
        if (!motionEnabled) {
          draw();
          return;
        }
        stripsContainer.alpha = 0;
        draw();
        let elapsed = 0;
        const onTick = (ticker: { deltaMS: number }) => {
          elapsed += ticker.deltaMS;
          stripsContainer.alpha = Math.min(1, elapsed / 250);
          if (elapsed >= 250) {
            app.ticker.remove(onTick);
          }
        };
        app.ticker.add(onTick);
        flashTicker = () => app.ticker.remove(onTick);
      }

      const unsubscribe = roundStore.subscribe(drawWithOptionalFlash);
      draw();

      return () => {
        unsubscribe();
        flashTicker?.();
      };
    },
  };
}
