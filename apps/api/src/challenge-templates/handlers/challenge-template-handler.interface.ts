import type { ChallengeConfig } from '../../challenges/challenge-config.interface';

export interface TemplateValidationError {
  // Casa com `TemplateParameterDefinition.key` — o frontend usa isto pra
  // anexar a mensagem embaixo do campo certo (AC3: "mensagem descritiva...
  // nunca um erro de validação genérico"), nunca um toast solto sem
  // contexto de qual campo motivou o bloqueio.
  parameterKey: string;
  // Sempre linguagem pedagógica, nunca "XML inválido"/"schema"/termo técnico
  // de Blockly (AC3, regra não-negociável 9) — cada handler escreve a
  // mensagem já pronta pra tela, o controller/service nunca traduz nada.
  message: string;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: TemplateValidationError[];
}

export interface TemplateValidationContext {
  // Blocos já introduzidos num desafio `stage: 'use'` do mesmo tópico (ver
  // ChallengeTemplatesService.getIntroducedBlockTypes) — a regra de
  // progressão Use-Modify-Create (coding-rule.md) vale também pro desafio
  // criado via template, nunca só pro currículo semeado.
  introducedBlockTypes: string[];
}

// Um handler por `ChallengeTemplate.key` (ver template-registry.ts) — é o
// único ponto de código que muda ao cadastrar um template novo. Tudo o que
// é genérico entre templates (galeria, formulário, preview no Pixi, CRUD do
// professor) fica no service/controller/frontend, nunca duplicado aqui.
export interface ChallengeTemplateHandler {
  readonly key: string;

  // Nunca lança exceção — parâmetro inválido é dado de entrada esperado
  // (o professor ainda está preenchendo o formulário), não um erro de
  // sistema. `buildChallengeConfig`/`buildPreviewGoal` só devem ser
  // chamados depois de `valid: true` aqui (o service garante isso).
  validateParameters(
    params: Record<string, unknown>,
    context: TemplateValidationContext,
  ): TemplateValidationResult;

  // Monta o `Challenge.config` real (o que o motor Blockly/Pixi do aluno
  // consome) a partir dos parâmetros pedagógicos — é aqui, e só aqui, que a
  // "tradução" de formulário simples pra estrutura interna acontece; nunca
  // no controller nem no frontend.
  buildChallengeConfig(params: Record<string, unknown>): ChallengeConfig;

  // Só o suficiente pra "Visualizar como aluno" (AC4) desenhar a forma-alvo
  // no PixiTurtleWorld, reaproveitando o mesmo mecanismo do botão de Ajuda
  // do aluno (buildGoalPreviewPath, ver turtleWorld.ts) — nunca expõe
  // blocos, só o `goal` numérico.
  buildPreviewGoal(params: Record<string, unknown>): Record<string, unknown>;
}
