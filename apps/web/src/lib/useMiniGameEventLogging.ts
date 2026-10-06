import { useEffect, useRef } from 'react';
import type { MiniGameSceneState, MiniGameStore } from '../stores/miniGameStore';
import {
  logMiniGameAbandoned,
  logMiniGameCompleted,
  logMiniGamePrimmPhaseChanged,
  logMiniGameSceneStarted,
  logMiniGameStepRetry,
} from './miniGameEvents';

// MJ7 - traduz mudanças em `MiniGameStore.activeScene` em eventos RD-*,
// desacoplado do motor de renderização (nenhum import de Pixi aqui,
// mesmo racional de MiniGameEngine.tsx nunca conhecer o schema de
// eventos) - o componente de cena só chama as ações do store
// (`startScene`/`recordAttempt`/`advancePhase`), este hook observa e loga.
// Assinado uma vez por instância de store (mesmo ciclo de vida do
// MiniGameEngine que a possui).
export function useMiniGameEventLogging(store: MiniGameStore, studentPseudoId: string | null): void {
  const previousRef = useRef<MiniGameSceneState | null>(null);

  useEffect(() => {
    if (!studentPseudoId) return;

    // Sincroniza com o estado JÁ presente no momento em que o hook monta
    // (ex.: `startScene` chamado antes deste efeito rodar) - sem isso, a
    // 1ª cena nunca dispararia `minigame_scene_started`.
    const initial = store.getState().activeScene;
    if (initial && previousRef.current === null) {
      logMiniGameSceneStarted(studentPseudoId, initial);
      previousRef.current = initial;
    }

    const unsubscribe = store.subscribe((state) => {
      const previous = previousRef.current;
      const next = state.activeScene;
      previousRef.current = next;

      if (!next) return;

      // Cena nova (nunca vista, ou trocou de `sceneId` - troca de cena É
      // sempre uma cena nova, nunca uma continuação da anterior).
      if (!previous || previous.sceneId !== next.sceneId) {
        logMiniGameSceneStarted(studentPseudoId, next);
        return;
      }

      if (next.status === 'completed' && previous.status !== 'completed') {
        logMiniGameCompleted(studentPseudoId, next);
        return;
      }

      if (next.phase !== previous.phase) {
        logMiniGamePrimmPhaseChanged(studentPseudoId, previous, next);
        return;
      }

      if (next.attempts > previous.attempts) {
        logMiniGameStepRetry(studentPseudoId, next);
      }
    });

    return () => {
      unsubscribe();
      // Desmontou (navegou pra outro lugar) com uma cena ainda ATIVA
      // (nunca concluída) - abandono, RD-E, mesmo racional de
      // `challenge_time_in_phase` medir só o que aconteceu, nunca inferir
      // porquê.
      const current = previousRef.current;
      if (current && current.status === 'active') {
        logMiniGameAbandoned(studentPseudoId, current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, studentPseudoId]);
}
