import { IsObject, ValidateIf } from 'class-validator';
import type { SerializedBlockState } from '../../challenges/challenge-config.interface';

// 3.17 — mesma árvore já enviada em `program_executed.block_sequence_json`
// (RD-P, frontend); reenviada aqui separadamente porque a validação
// precisa rodar no BACKEND (o professor nunca deve depender do aluno pra
// "reportar sua própria corretude"). `null` é workspace vazio, mesmo
// racional de `UpsertChallengeDraftDto.workspaceJson`.
export class SubmitWaterProgramDto {
  @ValidateIf((_, value) => value !== null)
  @IsObject()
  program: SerializedBlockState | null;
}
