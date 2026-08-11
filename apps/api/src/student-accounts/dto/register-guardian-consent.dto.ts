import { IsBoolean, IsString, Length } from 'class-validator';

// A2 — passo 2 do cadastro de aluno: dados do responsável legal (ECA) +
// aceite explícito de termo. `consentAccepted` precisa ser literalmente
// `true` para a conta avançar — a checagem de VALOR (não só de tipo) fica
// no service (mensagem pedagógica), mesmo padrão de validação em duas
// camadas já usado pros templates de desafio (schema vs. regra
// pedagógica).
export class RegisterGuardianConsentDto {
  @IsString()
  @Length(2, 120)
  guardianName: string;

  // "Vínculo" (ex.: mãe, pai, tutor legal) — texto livre, nunca um enum
  // fixo no schema (ver GuardianConsent.guardianRelationship).
  @IsString()
  @Length(2, 60)
  guardianRelationship: string;

  @IsString()
  @Length(3, 180)
  guardianContact: string;

  @IsBoolean()
  consentAccepted: boolean;
}
