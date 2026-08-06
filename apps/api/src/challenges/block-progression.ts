import { ChallengeStage } from './challenge-config.interface';

export interface ChallengeBlockUsage {
  challengeId: string;
  stage: ChallengeStage;
  allowedBlockTypes: string[];
}

export interface BlockProgressionViolation {
  blockType: string;
  challengeId: string;
  stage: ChallengeStage;
}

// AC2 da feature "blocos por desafio" (RQ4, regra não-negociável 2 — ciclo
// Use-Modify-Create): valida que todo blockType aparece pela primeira vez,
// na ordem cronológica de criação dos desafios, num desafio em estágio
// "use" — nunca estreando direto em "modify"/"create". `challenges` deve vir
// ordenado por criação (createdAt asc, a mesma ordem em que o currículo é
// apresentado ao aluno); a violação aponta pro desafio que introduziu o
// bloco errado. É uma checagem de autoria de currículo (roda contra o seed
// real em block-progression.spec.ts), não uma trava em runtime por aluno —
// não há ainda um segundo desafio (modify/create) para uma trava por aluno
// fazer sentido, ver "Próximos passos" em docs/ai/modules/backend.md.
export function findBlockProgressionViolations(
  challenges: ChallengeBlockUsage[],
): BlockProgressionViolation[] {
  const introducedBy = new Map<string, ChallengeBlockUsage>();
  for (const challenge of challenges) {
    for (const blockType of challenge.allowedBlockTypes) {
      if (!introducedBy.has(blockType)) {
        introducedBy.set(blockType, challenge);
      }
    }
  }

  const violations: BlockProgressionViolation[] = [];
  for (const [blockType, challenge] of introducedBy) {
    if (challenge.stage !== 'use') {
      violations.push({ blockType, challengeId: challenge.challengeId, stage: challenge.stage });
    }
  }
  return violations;
}
