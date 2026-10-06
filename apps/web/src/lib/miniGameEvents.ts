import { logEvent } from './logEvent';
import type { MiniGameSceneState } from '../stores/miniGameStore';

// MJ7 - vocabulário de eventos do mini jogo, reaproveitando exatamente o
// schema RD-I/RD-P/RD-C/RD-E/RD-L já usado pelo desafio de blocos (nenhuma
// taxonomia paralela - mesmo `logEvent`/`POST /events`). Cada função
// constrói o payload de UM tipo de evento a partir do `MiniGameSceneState`
// puro, sem depender de Pixi/React - testável isolado do motor de
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

// RD-I - interação: transição de fase é uma ação do aluno avançando no
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

// RD-I - cada nova tentativa dentro da MESMA fase (o aluno tentou de novo
// sem avançar) - equivalente a uma "repetição" no desafio de blocos.
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

// RD-C - curricular: ciclo PRIMM completo (chegou ao fim de 'make'),
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

// RD-E - engajamento-proxy: aluno saiu (mudou de rota/fechou) com a cena
// ainda ativa (não concluída). Regra não-negociável 7 aplicada
// literalmente: só o número bruto de tempo parado na fase, NUNCA um campo
// tipo "possível sobrecarga"/"abandono por dificuldade" - interpretação
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

// Estendido pro 1º mini jogo de conteúdo ("Fábrica de Pedaços Iguais", ver
// docs/ai/backlog/mini-jogo-fabrica-pedacos-iguais.md) - os 5 eventos acima
// são derivados automaticamente das transições do store
// (useMiniGameEventLogging); os 2 abaixo são ações explícitas do jogo (o
// clique em "Executar", a resposta opcional de predição) sem uma transição
// de fase 1:1 correspondente, então são chamados diretamente pela tela do
// jogo (FractionsGamePage), não pelo hook genérico. Mesmas 5 categorias
// RD-*, nenhuma taxonomia paralela (regra não-negociável 6).

// RD-P - produto: o estado do "programa" (sequência de cartões) que o
// aluno executou, equivalente a `program_executed` no desafio de blocos.
// `miniGameLevelId` (FK real, ver InteractionEvent) permite ao admin cruzar
// isto sem parsear `scene_id` como string.
export function logMiniGameRoundExecuted(
  studentPseudoId: string,
  miniGameLevelId: string,
  scene: MiniGameSceneState,
  details: { sequence: unknown; matchedTarget: boolean },
): void {
  logEvent({
    studentPseudoId,
    miniGameLevelId,
    category: 'RD-P',
    type: 'minigame_round_executed',
    payload: {
      concept_id: scene.conceptId,
      scene_id: scene.sceneId,
      sequence: details.sequence,
      matched_target: details.matchedTarget,
      timestamp: new Date().toISOString(),
    },
  });
}

// RD-C - curricular: resposta à predição opcional ("quantos pedaços você
// acha que vai sair?"). Só é chamado quando o aluno de fato responde - a
// predição nunca bloqueia o avanço (regra de MJ1/PRIMM), então pular não
// gera evento nenhum, nunca um evento "predição pulada" com conotação
// negativa.
export function logMiniGamePredictAnswered(
  studentPseudoId: string,
  miniGameLevelId: string,
  scene: MiniGameSceneState,
  predictedParts: number,
): void {
  logEvent({
    studentPseudoId,
    miniGameLevelId,
    category: 'RD-C',
    type: 'minigame_predict_answered',
    payload: {
      concept_id: scene.conceptId,
      scene_id: scene.sceneId,
      predicted_parts: predictedParts,
      timestamp: new Date().toISOString(),
    },
  });
}

// MJ10 - 2º mini jogo de CONTEÚDO ("Ferramentas do Mundo do Trabalho", ver
// docs/ai/backlog/mini-jogo-ferramentas-mundo-trabalho.md). Mesmo racional
// dos 2 eventos de frações acima: ações explícitas do jogo, sem uma
// transição de fase 1:1, chamadas diretamente pela tela do jogo
// (WorkToolsGamePage), não pelo hook genérico. Mesmas 5 categorias RD-*,
// nenhuma taxonomia paralela (regra não-negociável 6).

// RD-P - produto: o par cenário↔ferramenta que o aluno acabou de ligar
// (correto ou não - o dado bruto é o que importa, a interpretação de
// "certo"/"errado" é derivada no momento da leitura, nunca decidida aqui).
export function logWorkToolsMatchMade(
  studentPseudoId: string,
  miniGameLevelId: string,
  scene: MiniGameSceneState,
  details: { scenarioId: string; toolId: string; correct: boolean },
): void {
  logEvent({
    studentPseudoId,
    miniGameLevelId,
    category: 'RD-P',
    type: 'work_tools_match_made',
    payload: {
      concept_id: scene.conceptId,
      scene_id: scene.sceneId,
      scenario_id: details.scenarioId,
      tool_id: details.toolId,
      correct: details.correct,
      timestamp: new Date().toISOString(),
    },
  });
}

// RD-C - curricular: julgamento verdadeiro/falso do aluno sobre uma
// afirmação de uso/custo-benefício de uma ferramenta.
export function logWorkToolsStatementAnswered(
  studentPseudoId: string,
  miniGameLevelId: string,
  scene: MiniGameSceneState,
  details: { statementId: string; answeredTrue: boolean; correct: boolean },
): void {
  logEvent({
    studentPseudoId,
    miniGameLevelId,
    category: 'RD-C',
    type: 'work_tools_statement_answered',
    payload: {
      concept_id: scene.conceptId,
      scene_id: scene.sceneId,
      statement_id: details.statementId,
      answered_true: details.answeredTrue,
      correct: details.correct,
      timestamp: new Date().toISOString(),
    },
  });
}
