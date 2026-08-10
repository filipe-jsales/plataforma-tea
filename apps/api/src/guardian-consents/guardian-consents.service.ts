import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuardianConsent } from './entities/guardian-consent.entity';

export interface RecordConsentParams {
  studentId: string;
  guardianName: string;
  guardianRelationship: string;
  guardianContact: string;
  consentedAt: Date;
  collectedByUserId: string;
}

// A2 — CRUD mínimo sobre o consentimento do responsável legal. Só
// `recordConsent` escreve (nunca update/delete — ver nota na entidade).
@Injectable()
export class GuardianConsentsService {
  constructor(
    @InjectRepository(GuardianConsent)
    private readonly guardianConsentsRepository: Repository<GuardianConsent>,
  ) {}

  // AC4 — usado tanto pela checagem de bloqueio de ativação (só o boolean
  // importa) quanto pela tela de auditoria do admin (registro completo,
  // com o professor/admin que coletou já carregado via relation).
  findByStudentId(studentId: string): Promise<GuardianConsent | null> {
    return this.guardianConsentsRepository.findOne({
      where: { studentId },
      relations: { collectedBy: true },
    });
  }

  async hasConsent(studentId: string): Promise<boolean> {
    const count = await this.guardianConsentsRepository.count({
      where: { studentId },
    });
    return count > 0;
  }

  recordConsent(params: RecordConsentParams): Promise<GuardianConsent> {
    const consent = this.guardianConsentsRepository.create(params);
    return this.guardianConsentsRepository.save(consent);
  }
}
