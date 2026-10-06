import { Graphics, Text } from 'pixi.js';
import { PRIMM_PHASES } from '../../../lib/primmLifecycle';
import type { MiniGameSceneDefinition } from '../MiniGameEngine';

const BUTTON_RADIUS = 56;

// MJ1 - cena mínima só pra provar o ciclo de vida do motor ponta a ponta
// (montar/desmontar, avançar as 5 fases do PRIMM, disparar os eventos de
// MJ7) - NÃO é conteúdo pedagógico de verdade. MJ3/MJ4/MJ5 (roteiro
// visual, áreas de interação tolerantes, rotulagem redundante completa)
// são cartões separados que qualquer cena de CONTEÚDO real precisa seguir
// - esta aqui é propositalmente a mais simples possível.
//
// Nunca mostra os rótulos técnicos do PRIMM ao aluno (regra não-negociável
// 3) - "Etapa N de 5" é a única coisa exibida, nunca "predict"/"run"/etc.
export function createPlaceholderScene(conceptId: string): MiniGameSceneDefinition {
  return {
    id: `placeholder:${conceptId}`,
    conceptId,
    mount({ app, store }) {
      const origin = { x: app.screen.width / 2, y: app.screen.height / 2 };

      const label = new Text({
        text: '',
        style: { fill: 0x1a1a1a, fontSize: 20, fontWeight: '600', align: 'center' },
      });
      label.anchor.set(0.5);
      label.position.set(origin.x, origin.y - BUTTON_RADIUS - 40);
      app.stage.addChild(label);

      const button = new Graphics();
      button.eventMode = 'static';
      button.cursor = 'pointer';
      button.position.set(origin.x, origin.y);
      app.stage.addChild(button);

      const buttonLabel = new Text({
        text: '',
        style: { fill: 0xffffff, fontSize: 16, fontWeight: '600', align: 'center' },
      });
      buttonLabel.anchor.set(0.5);
      app.stage.addChild(buttonLabel);

      function draw() {
        const scene = store.getState().activeScene;
        if (!scene) return;

        const stepNumber = PRIMM_PHASES.indexOf(scene.phase) + 1;
        const totalSteps = PRIMM_PHASES.length;
        const completed = scene.status === 'completed';

        label.text = completed ? 'Você concluiu! ✅' : `Etapa ${stepNumber} de ${totalSteps}`;

        button.clear();
        button.circle(0, 0, BUTTON_RADIUS).fill({ color: completed ? 0x2f9e44 : 0x2b6cb0 });
        buttonLabel.position.set(origin.x, origin.y);
        buttonLabel.text = completed ? '🏁' : '➡️';
        button.eventMode = completed ? 'none' : 'static';
        button.cursor = completed ? 'default' : 'pointer';
      }

      function handleTap() {
        const scene = store.getState().activeScene;
        if (!scene || scene.status === 'completed') return;
        store.getState().advancePhase();
      }

      button.on('pointertap', handleTap);
      const unsubscribe = store.subscribe(draw);
      draw();

      return () => {
        unsubscribe();
        button.off('pointertap', handleTap);
      };
    },
  };
}
