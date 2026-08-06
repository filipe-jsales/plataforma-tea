import { MigrationInterface, QueryRunner } from "typeorm";

// Preenche o `config` (nascido `{}` na migration CreateChallenges) do
// desafio seed "Monte o quadrado" com a toolbox restrita da feature "blocos
// por desafio" (RQ4): estágio "use" (primeira exposição do aluno aos 3
// blocos, ver block-progression.ts) + a meta que ChallengePage usa pra dar
// feedback reversível (fechar um quadrado com 4 lados e giros de 90°) — a
// mesma disciplina/assunto já seedados em CreateSubjectsAndTopics
// (geometria / ângulos e formas), então resolver o desafio via blocos
// também ensina o conceito curricular (ângulo reto), não só lógica solta.
export class SeedSquareChallengeToolbox1786027834394 implements MigrationInterface {
    name = 'SeedSquareChallengeToolbox1786027834394'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          UPDATE "challenges"
          SET "config" = '{
            "stage": "use",
            "allowedBlockTypes": ["move_forward", "turn", "repeat_times"],
            "goal": { "shape": "square", "sides": 4, "turnAngleDeg": 90 }
          }'::jsonb
          WHERE "title" = 'Monte o quadrado'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          UPDATE "challenges" SET "config" = '{}'::jsonb WHERE "title" = 'Monte o quadrado'
        `);
    }

}
