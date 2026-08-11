import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StudentChallengeView } from './entities/student-challenge-view.entity';

@Injectable()
export class ChallengeViewsService {
  constructor(
    @InjectRepository(StudentChallengeView)
    private readonly viewsRepository: Repository<StudentChallengeView>,
  ) {}

  // E1 (AC1/AC3) — usado por `ChallengeAllocationsService.findAvailableForStudent`
  // pra marcar `isNew` de uma lista inteira numa query só (nunca N+1 — uma
  // checagem por desafio na lista, não uma chamada por item).
  async findViewedChallengeIds(
    studentId: string,
    challengeIds: string[],
  ): Promise<Set<string>> {
    if (challengeIds.length === 0) {
      return new Set();
    }
    const rows = await this.viewsRepository.find({
      where: { studentId, challengeId: In(challengeIds) },
    });
    return new Set(rows.map((row) => row.challengeId));
  }

  // E1 (AC2) — "marcador removido automaticamente, sem exigir ação extra".
  // Idempotente: a segunda chamada pro mesmo par aluno+desafio é um no-op
  // silencioso (nunca ConflictException) — `ChallengePage` chama isto toda
  // vez que o desafio é aberto, não só na primeira.
  async markViewed(studentId: string, challengeId: string): Promise<void> {
    const existing = await this.viewsRepository.findOne({
      where: { studentId, challengeId },
    });
    if (existing) {
      return;
    }
    const view = this.viewsRepository.create({ studentId, challengeId });
    try {
      await this.viewsRepository.save(view);
    } catch {
      // Corrida rara entre a checagem acima e o insert (ex.: 2 abas abertas
      // no mesmo desafio) — a UNIQUE(studentId, challengeId) já garante que
      // só uma linha sobrevive; a segunda tentativa é um no-op esperado,
      // não um erro real pro aluno.
    }
  }
}
