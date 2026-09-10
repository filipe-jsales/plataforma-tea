import { MigrationInterface, QueryRunner } from 'typeorm';

// CC1 — classificação de catálogo (Informática Educacional × Educação em
// Computação), ver docs/ai/backlog/categorizacao-informatica-educacional-
// x-educacao-computacao.md. DEFAULT 'informatica_educacional' já classifica
// corretamente TODO conteúdo existente (angulos_formas, water_state,
// Fábrica de Pedaços Iguais são todos Informática Educacional) — nenhum
// UPDATE explícito necessário, diferente de outras migrations que
// precisaram reclassificar dado pré-existente.
export class AddContentCategoryToCatalog1787600000000
  implements MigrationInterface
{
  name = 'AddContentCategoryToCatalog1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "topics" ADD "category" character varying(40) NOT NULL DEFAULT 'informatica_educacional'`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_game_levels" ADD "category" character varying(40) NOT NULL DEFAULT 'informatica_educacional'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mini_game_levels" DROP COLUMN "category"`,
    );
    await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "category"`);
  }
}
