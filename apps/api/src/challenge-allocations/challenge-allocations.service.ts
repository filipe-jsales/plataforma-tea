import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChallengesService } from '../challenges/challenges.service';
import { Classroom } from '../schools/entities/classroom.entity';
import { SchoolsService } from '../schools/schools.service';
import { ChallengeClassroomAllocation } from './entities/challenge-classroom-allocation.entity';

export interface ClassroomAllocationSummary {
  classroomId: string;
  classroomName: string;
  classroomJoinCode: string;
}

export interface AvailableChallengeForStudent {
  id: string;
  title: string;
  prompt: string;
}

// 4.3 — Alocação de desafio a uma turma. Sem isso, um desafio criado via
// Modo Template (4.2) fica preso na biblioteca do professor: nenhum aluno
// alcança um desafio que não foi explicitamente alocado à turma dele (AC3).
//
// ── Nota de arquitetura: por que a alocação NÃO vira um `interaction_event`
// (mesmo a AC pedindo "log RD-C: desafio_id, turma_id, professor_id,
// timestamp_alocacao") ──────────────────────────────────────────────────
// `interaction_events.studentPseudoId` é `NOT NULL` de propósito — o schema
// RD-I/P/C/E/L existe pra avaliar Pensamento Computacional do ESTUDANTE
// (RQ5), não telemetria operacional de professor (ver "Padrão: eventos RD-*
// são escopados ao aluno" em docs/ai/modules/backend.md — já vale pra
// login de professor, `templateParams` de 4.2, e agora pra isto). Forçar um
// pseudônimo de staff dentro de `studentPseudoId` pra caber no formato RD-C
// seria exatamente o anti-padrão que aquela seção já rejeita. Em vez disso,
// a PRÓPRIA LINHA de `ChallengeClassroomAllocation` já contém os 4 campos
// que a AC pede — `challengeId`, `classroomId`, `allocatedByUserId`,
// `allocatedAt` — e cumpre o objetivo real da AC (RQ5: "qual configuração
// curricular foi usada por qual turma" é rastreável cruzando esta tabela
// com `interaction_events.challengeId`, sem duplicar o dado numa segunda
// tabela). Mesmo padrão de `templateParams` (4.2) e de `ExportAuditLog`
// (6.6) — "auditoria/metadado de ação de staff" sempre vira uma coluna/
// tabela dedicada, nunca um evento fake de aluno.
@Injectable()
export class ChallengeAllocationsService {
  constructor(
    @InjectRepository(ChallengeClassroomAllocation)
    private readonly allocationsRepository: Repository<ChallengeClassroomAllocation>,
    private readonly challengesService: ChallengesService,
    private readonly schoolsService: SchoolsService,
  ) {}

  // AC1 — a tela de alocação lista as turmas do desafio (pra mostrar quais
  // já estão marcadas) só depois de confirmar que o desafio é do professor
  // autenticado.
  async listForTeacherChallenge(challengeId: string, teacherId: string): Promise<ClassroomAllocationSummary[]> {
    await this.assertOwnChallenge(challengeId, teacherId);
    const allocations = await this.allocationsRepository.find({
      where: { challengeId },
      relations: { classroom: true },
    });
    return allocations.map((allocation) => this.toSummary(allocation.classroom));
  }

  // AC1 (a turma precisa ser do professor, "nunca todas as turmas da
  // escola") + AC2 (efeito imediato — a mesma linha que autoriza já é o
  // que `findAvailableForStudent` lê, sem passo de publicação separado).
  async allocate(challengeId: string, teacherId: string, classroomId: string): Promise<ClassroomAllocationSummary> {
    await this.assertOwnChallenge(challengeId, teacherId);
    const classroom = await this.assertOwnClassroom(classroomId, teacherId);

    const existing = await this.allocationsRepository.findOne({ where: { challengeId, classroomId } });
    if (existing) {
      throw new ConflictException('Este desafio já está alocado a esta turma.');
    }

    const allocation = this.allocationsRepository.create({
      challengeId,
      classroomId,
      allocatedByUserId: teacherId,
    });
    await this.allocationsRepository.save(allocation);
    return this.toSummary(classroom);
  }

  // AC5 — remove só o vínculo; o desafio e qualquer progresso já registrado
  // (`interaction_events.challengeId`, independente da alocação) continuam
  // intactos.
  async deallocate(challengeId: string, teacherId: string, classroomId: string): Promise<void> {
    await this.assertOwnChallenge(challengeId, teacherId);
    const allocation = await this.allocationsRepository.findOne({ where: { challengeId, classroomId } });
    if (!allocation) {
      throw new NotFoundException('Este desafio não está alocado a esta turma.');
    }
    await this.allocationsRepository.remove(allocation);
  }

  // AC2/AC3/AC4 — só devolve desafio alocado à turma ATIVA do aluno
  // autenticado. MVP: 1 aluno = 1 turma ativa — lê só a primeira matrícula
  // ativa (`findActiveEnrollmentsByStudent` já é N:N-capaz no schema, ver
  // Enrollment; esta é a leitura que trata "1:1" como regra de produto do
  // MVP, não uma limitação do banco).
  async findAvailableForStudent(studentUserId: string): Promise<AvailableChallengeForStudent[]> {
    const enrollments = await this.schoolsService.findActiveEnrollmentsByStudent(studentUserId);
    const classroomId = enrollments[0]?.classroomId;
    if (!classroomId) {
      return [];
    }

    const allocations = await this.allocationsRepository.find({
      where: { classroomId },
      relations: { challenge: true },
      order: { allocatedAt: 'DESC' },
    });
    return allocations.map((allocation) => ({
      id: allocation.challenge.id,
      title: allocation.challenge.title,
      prompt: allocation.challenge.prompt,
    }));
  }

  private async assertOwnChallenge(challengeId: string, teacherId: string): Promise<void> {
    const challenge = await this.challengesService.findByIdForOwner(challengeId, teacherId);
    if (!challenge) {
      throw new NotFoundException('Desafio não encontrado.');
    }
  }

  // AC1 — "nunca todas as turmas da escola": só a titular (mesma checagem
  // de `MetricsTeacherService.assertOwnClassroom`, aqui reimplementada
  // porque vive em módulo diferente — não vale importar MetricsModule só
  // por este método).
  private async assertOwnClassroom(classroomId: string, teacherId: string): Promise<Classroom> {
    const classroom = await this.schoolsService.findClassroomById(classroomId);
    if (!classroom) {
      throw new NotFoundException('Turma não encontrada.');
    }
    if (classroom.teacherId !== teacherId) {
      throw new ForbiddenException('Você não é o professor titular desta turma.');
    }
    return classroom;
  }

  private toSummary(classroom: Classroom): ClassroomAllocationSummary {
    return { classroomId: classroom.id, classroomName: classroom.name, classroomJoinCode: classroom.joinCode };
  }
}
