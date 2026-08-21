import { logEvent } from './logEvent';
import type { MiniGameSceneState } from '../stores/miniGameStore';

// MJ7 — vocabulário de eventos do mini jogo, reaproveitando exatamente o
// schema RD-I/RD-P/RD-C/RD-E/RD-L já usado pelo desafio de blocos (nenhuma
// taxonomia paralela — mesmo `logEvent`/`POST /events`). Cada função
// constrói o payload de UM tipo de evento a partir do `MiniGameSceneState`
// puro, sem depender de Pixi/React — testável isolado do motor de
// renderização (ver miniGameEvents.spec.ts).
//
// `concept_id` sempre presente no payload (nunca só nos metadados da
// cena): é o campo que MJ8 (futuro, ver docs/ai/backlog/
// mini-jogos-serios.md) vai usar pra cruzar com eventos do desafio de
// blocos equivalente sobre o mesmo assunto curricular.

export function logMiniGameSceneStarted(studentPseudoId: string, scene: MiniGameSceneState): void {
  logEvent({
    studentPseudoId,
    category: 'RD-P',
    type: 'minigame_scene_started',
    payload: {
      concept_id: scene.conceptId,
      scene_id: scene.sceneId,
      timestamp: new Date().toISOString(),
    },
  });
}

// RD-I — interação: transição de fase é uma ação do aluno avançando no
// ciclo PRIMM interno (nunca exposto como rótulo na UI, ver
// primmLifecycle.ts), análoga a `block_dragged`/`toolbox_rendered` no
// desafio de blocos.
export function logMiniGamePrimmPhaseChanged(
  studentPseudoId: string,
  previous: MiniGameSceneState,
  next: MiniGameSceneState,
): void {
  logEvent({
    studentPseudoId,
    category: 'RD-I',
    type: 'minigame_primm_phase_changed',
    payload: {
      concept_id: next.conceptId,
      scene_id: next.sceneId,
      from_phase: previous.phase,
      to_phase: next.phase,
      attempts_in_phase: previous.attempts,
      time_in_phase_ms: next.phaseEnteredAt - previous.phaseEnteredAt,
      timestamp: new Date().toISOString(),
    },
  });
}

// RD-I — cada nova tentativa dentro da MESMA fase (o aluno tentou de novo
// sem avançar) — equivalente a uma "repetição" no desafio de blocos.
export function logMiniGameStepRetry(studentPseudoId: string, scene: MiniGameSceneState): void {
  logEvent({
    studentPseudoId,
    category: 'RD-I',
    type: 'minigame_step_retry',
    payload: {
      concept_id: scene.conceptId,
      scene_id: scene.sceneId,
      phase: scene.phase,
      attempt_number: scene.attempts,
      timestamp: new Date().toISOString(),
    },
  });
}

// RD-C — curricular: ciclo PRIMM completo (chegou ao fim de 'make'),
// mesmo racional de `challenge.completed` no desafio de blocos.
export function logMiniGameCompleted(studentPseudoId: string, scene: MiniGameSceneState): void {
  logEvent({
    studentPseudoId,
    category: 'RD-C',
    type: 'minigame_completed',
    payload: {
      concept_id: scene.conceptId,
      scene_id: scene.sceneId,
      total_time_ms: Date.now() - scene.startedAt,
      timestamp: new Date().toISOString(),
    },
  });
}

// RD-E — engajamento-proxy: aluno saiu (mudou de rota/fechou) com a cena
// ainda ativa (não concluída). Regra não-negociável 7 aplicada
// literalmente: só o número bruto de tempo parado na fase, NUNCA um campo
// tipo "possível sobrecarga"/"abandono por dificuldade" — interpretação
// clínica não é responsabilidade do software.
export function logMiniGameAbandoned(studentPseudoId: string, scene: MiniGameSceneState): void {
  logEvent({
    studentPseudoId,
    category: 'RD-E',
    type: 'minigame_abandoned',
    payload: {
      concept_id: scene.conceptId,
      scene_id: scene.sceneId,
      phase_at_abandon: scene.phase,
      attempts_in_phase: scene.attempts,
      time_in_phase_ms: Date.now() - scene.phaseEnteredAt,
      timestamp: new Date().toISOString(),
    },
  });
}
