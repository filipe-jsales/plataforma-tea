import { IsObject, ValidateIf } from 'class-validator';

// C2 — corpo do autosave. `workspaceJson` é sempre exigido no corpo (nunca
// omitido — sem `@IsOptional()`, que também tornaria a CHAVE opcional), mas
// pode ser `null`: workspace vazio é um estado válido pra salvar (ver
// StudentChallengeDraft.workspaceJson).
export class UpsertChallengeDraftDto {
  @ValidateIf((_, value) => value !== null)
  @IsObject()
  workspaceJson: Record<string, unknown> | null;
}
