import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../common/enums/role.enum';
import { GuardianConsentsService } from './guardian-consents.service';

export interface GuardianConsentAdminView {
  recorded: boolean;
  guardianName: string | null;
  guardianRelationship: string | null;
  guardianContact: string | null;
  consentedAt: string | null;
  collectedByDisplayName: string | null;
}

// A2 (AC4) — "quando um admin consulta o cadastro daquele aluno
// posteriormente, ele consegue visualizar quando e por quem o
// consentimento foi coletado." Sempre 200 — `recorded: false` (resto
// null) descreve "ainda pendente", não um erro; o id já vem de uma tela
// (AdminUsers) que já sabe que o aluno existe, então não há necessidade de
// checar isso aqui de novo.
@Controller('admin/students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class GuardianConsentsAdminController {
  constructor(
    private readonly guardianConsentsService: GuardianConsentsService,
  ) {}

  @Get(':id/guardian-consent')
  async getConsent(@Param('id') id: string): Promise<GuardianConsentAdminView> {
    const consent = await this.guardianConsentsService.findByStudentId(id);
    if (!consent) {
      return {
        recorded: false,
        guardianName: null,
        guardianRelationship: null,
        guardianContact: null,
        consentedAt: null,
        collectedByDisplayName: null,
      };
    }
    return {
      recorded: true,
      guardianName: consent.guardianName,
      guardianRelationship: consent.guardianRelationship,
      guardianContact: consent.guardianContact,
      consentedAt: consent.consentedAt.toISOString(),
      collectedByDisplayName: consent.collectedBy?.displayName ?? null,
    };
  }
}
