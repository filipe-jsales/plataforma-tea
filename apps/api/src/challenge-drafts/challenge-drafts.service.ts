import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentChallengeDraft } from './entities/student-challenge-draft.entity';

// C2 — upsert manual (find + save/create), não o `repository.upsert()`
// mágico do TypeORM: mesmo padrão de `SchoolsService.updateSchool`/
// `updateClassroom` já usado no projeto pra "atualiza se existe, cria se
// não" — explícito e fácil de testar com mocks simples de repositório.
@Injectable()
export class ChallengeDraftsService {
  constructor(
    @InjectRepository(StudentChallengeDraft)
    private readonly draftsRepository: Repository<StudentChallengeDraft>,
  ) {}

  findByStudentAndChallenge(
    studentId: string,
    challengeId: string,
  ): Promise<StudentChallengeDraft | null> {
    return this.draftsRepository.findOne({ where: { studentId, challengeId } });
  }

  async upsert(
    studentId: string,
    challengeId: string,
    workspaceJson: Record<string, unknown> | null,
  ): Promise<StudentChallengeDraft> {
    const existing = await this.findByStudentAndChallenge(
      studentId,
      challengeId,
    );
    if (existing) {
      existing.workspaceJson = workspaceJson;
      return this.draftsRepository.save(existing);
    }
    const created = this.draftsRepository.create({
      studentId,
      challengeId,
      workspaceJson,
    });
    return this.draftsRepository.save(created);
  }

  // AC3 — consolidação/descarte na submissão final: nunca erro se não
  // houver rascunho pra apagar (idempotente de propósito — o front chama
  // isto sempre que o desafio é concluído, tenha ou não autosave prévio).
  async discard(studentId: string, challengeId: string): Promise<void> {
    await this.draftsRepository.delete({ studentId, challengeId });
  }
}
