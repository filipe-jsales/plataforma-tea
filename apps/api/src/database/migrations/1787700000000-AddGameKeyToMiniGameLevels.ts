import { MigrationInterface, QueryRunner } from 'typeorm';

// MJ9 — antes de um 2º jogo de conteúdo existir, `MinigamesService` não
// tinha como saber QUAL jogo estava validando (só existia "Fábrica de
// Pedaços Iguais"). `gameKey` é o discriminador que o novo registry de
// validadores usa (ver validators/validator-registry.ts) — mesmo racional
// de `Topic.domain`. Nullable primeiro + UPDATE explícito + NOT NULL depois
// (não um DEFAULT): diferente de `category` (CC1, onde o default sozinho já
// classificava certo todo dado existente), aqui um DEFAULT seria só um
// acidente de sorte (hoje só existe 1 jogo) — melhor deixar o próximo
// jogo/migration explícito, nunca dependente de um valor implícito.
export class AddGameKeyToMiniGameLevels1787700000000
  implements MigrationInterface
{
  name = 'AddGameKeyToMiniGameLevels1787700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mini_game_levels" ADD "gameKey" character varying(40)`,
    );
    await queryRunner.query(
      `UPDATE "mini_game_levels" SET "gameKey" = 'fractions_factory' WHERE "conceptId" = 'fractions_equal_parts'`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_game_levels" ALTER COLUMN "gameKey" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mini_game_levels" DROP COLUMN "gameKey"`,
    );
  }
}
