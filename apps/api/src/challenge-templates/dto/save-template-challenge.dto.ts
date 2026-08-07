import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
