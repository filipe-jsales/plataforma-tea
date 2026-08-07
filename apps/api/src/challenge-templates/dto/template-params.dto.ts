import { IsObject } from 'class-validator';

// Wrapper genérico de propósito — o formato interno de `params` muda por
// template (ver TemplateParameterDefinition), então class-validator só
// garante "é um objeto"; a validação pedagógica de verdade acontece no
// handler do template (regra não-negociável 9 — nunca "erro de schema"
// chegando na tela do professor).
export class TemplateParamsDto {
  @IsObject()
  params: Record<string, unknown>;
}
