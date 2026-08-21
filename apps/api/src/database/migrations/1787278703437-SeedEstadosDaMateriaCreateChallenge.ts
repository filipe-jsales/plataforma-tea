import { MigrationInterface, QueryRunner } from 'typeorm';

// 3.12 (AC3) — fecha a sequência Use→Modify→Create da trilha "Estados da
// Matéria" (SeedEstadosDaMateriaTopic só tinha `use`/`modify`, mesmo estado
// intermediário documentado lá) com o "Desafio 3": editor livre, mesma
// paleta completa (`conditional_if` + `set_water_state`) que os dois
// anteriores já usam via `allowedBlockTypes`, mas SEM `program` — o aluno
// monta o SE/ENTÃO/SENÃO do zero, mesmo racional de "Monte o quadrado —
// sua vez!" em SeedUseModifyCreateSequence (fase `create` sempre sem
// `program` pré-montado, `WaterStateChallengePage.toInitialWorkspaceJson`
// já trata `program: null` como workspace vazio).
export class SeedEstadosDaMateriaCreateChallenge1787278703437 implements MigrationInterface {
  name = 'SeedEstadosDaMateriaCreateChallenge1787278703437';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          INSERT INTO "challenges" ("topicId", "title", "prompt", "position", "config")
          SELECT
            "id",
            'Como a água muda de estado? — crie o seu!',
            'Agora é com você: monte um programa que decida se a água fica sólida, líquida ou gasosa dependendo da temperatura.',
            3,
            '{
              "stage": "create",
              "allowedBlockTypes": ["conditional_if", "set_water_state"],
              "goal": { "initialTemperatureC": 20, "boilingThresholdC": 100 }
            }'::jsonb
          FROM "topics" WHERE "slug" = 'estados_da_materia'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "challenges" WHERE "title" = 'Como a água muda de estado? — crie o seu!'`,
    );
  }
}
