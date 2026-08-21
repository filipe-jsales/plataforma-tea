import { MigrationInterface, QueryRunner } from 'typeorm';

// MJ7 estendido — mesmo racional de AddChallengeIdToInteractionEvents, pro
// domínio de mini jogos sérios. Nullable: nem todo evento de mini jogo
// referencia um nível cadastrado (a cena placeholder de MJ1 não é backed
// por uma linha de mini_game_levels).
export class AddMiniGameLevelIdToInteractionEvents1787400100000
  implements MigrationInterface
{
  name = 'AddMiniGameLevelIdToInteractionEvents1787400100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "interaction_events" ADD "miniGameLevelId" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_interaction_events_miniGameLevelId" ON "interaction_events" ("miniGameLevelId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "interaction_events" ADD CONSTRAINT "FK_interaction_events_miniGameLevelId" FOREIGN KEY ("miniGameLevelId") REFERENCES "mini_game_levels"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "interaction_events" DROP CONSTRAINT "FK_interaction_events_miniGameLevelId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_interaction_events_miniGameLevelId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interaction_events" DROP COLUMN "miniGameLevelId"`,
    );
  }
}
