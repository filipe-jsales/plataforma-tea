import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ChallengeFeedbackMessages } from '../../challenges/challenge-config.interface';

// Corpo de POST /challenge-templates/:id/challenges e
// PATCH /teacher/challenges/:id — os mesmos dois campos "de professor"
// (título em linguagem pedagógica + parâmetros do formulário guiado) tanto
// pra criar quanto pra editar, nunca um payload de estrutura de blocos.
export class SaveTemplateChallengeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  // Opcional: quando ausente, o service gera um enunciado default a partir
  // dos parâmetros (ver ChallengeTemplatesService.buildDefaultPrompt) — o
  // professor não é obrigado a escrever prosa pra publicar um desafio.
  @IsOptional()
  @IsString()
  prompt?: string;

  @IsObject()
  params: Record<string, unknown>;

  // 3.7 (AC4) — opcional: forma validada de verdade (comprimento + ausência
  // de linguagem punitiva) em ChallengeTemplatesService, não aqui — este
  // decorator só garante a FORMA do payload (objeto, não string/array
  // solto), mesmo racional de `params` acima.
  @IsOptional()
  @IsObject()
  feedbackMessages?: ChallengeFeedbackMessages;

  // 7.5 — perguntas PRIMM (Predição/Investigação). Ao contrário de
  // `feedbackMessages`, são OBRIGATÓRIAS pra publicar — mas essa
  // obrigatoriedade é checada em ChallengeTemplatesService
  // (`validatePrimmQuestions`), não aqui: os decorators abaixo só validam
  // a FORMA (string, quando presente), pra o professor ver a mensagem
  // pedagógica de "campo obrigatório" (regra não-negociável 9), nunca um
  // 400 genérico de payload malformado.
  @IsOptional()
  @IsString()
  predictQuestion?: string;

  @IsOptional()
  @IsString()
  investigationQuestion?: string;
}
