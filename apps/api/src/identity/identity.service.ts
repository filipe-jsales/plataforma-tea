import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentIdentityReversal } from './entities/student-identity-reversal.entity';

// Único ponto de acesso à reversão pseudônimo → identidade real. Qualquer
// rota que exponha isso (futura) precisa restringir a role=admin (ou
// role=teacher da própria escola) — nunca ao EventsModule/relatórios de
// engajamento. Ver regra não-negociável 8 em docs/ai/rules/coding-rule.md.
@Injectable()
export class IdentityService {
  constructor(
    @InjectRepository(StudentIdentityReversal)
    private readonly reversalsRepository: Repository<StudentIdentityReversal>,
  ) {}

  createReversal(params: {
    userId: string;
    pseudonymId: string;
    schoolId: string;
    schoolReversibleRef?: string | null;
  }): Promise<StudentIdentityReversal> {
    const reversal = this.reversalsRepository.create({
      userId: params.userId,
      pseudonymId: params.pseudonymId,
      schoolId: params.schoolId,
      schoolReversibleRef: params.schoolReversibleRef ?? null,
    });
    return this.reversalsRepository.save(reversal);
  }

  reveal(pseudonymId: string): Promise<StudentIdentityReversal | null> {
    return this.reversalsRepository.findOne({ where: { pseudonymId } });
  }
}
