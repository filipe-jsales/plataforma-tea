import { MigrationInterface, QueryRunner } from 'typeorm';

// 1º mini jogo de CONTEÚDO real da plataforma ("Fábrica de Pedaços
// Iguais", frações) — ver docs/ai/backlog/mini-jogo-fabrica-pedacos-iguais.md.
// 3 linhas = os 3 níveis Use→Modify→Create (mesmo padrão de
// SeedUseModifyCreateSequence/SeedModifyChallenge pro desafio de blocos).
// `config` é tipado em apps/api/src/minigames/mini-game-level-config.interface.ts.
//
// Nada aqui é gabarito oculto (ver nota na interface) — `presetSequence`/
// `targetFraction` são exatamente o que o aluno vê na tela.
export class CreateMiniGameLevels1787400000000 implements MigrationInterface {
  name = 'CreateMiniGameLevels1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "mini_game_levels" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "conceptId" character varying(100) NOT NULL,
        "stage" character varying(10) NOT NULL,
        "position" integer NOT NULL,
        "title" character varying(150) NOT NULL,
        "prompt" text NOT NULL,
        "config" jsonb NOT NULL DEFAULT '{}',
        "updatedByUserId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mini_game_levels_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_mini_game_levels_conceptId" ON "mini_game_levels" ("conceptId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "mini_game_levels" ADD CONSTRAINT "FK_mini_game_levels_updatedByUserId" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL`,
    );

    const useConfig = JSON.stringify({
      theme: 'chocolate_bar',
      targetFraction: { numerator: 1, denominator: 2 },
      presetSequence: [
        { type: 'choose_whole' },
        { type: 'cut_equal_parts', parts: 2 },
        { type: 'separate_pieces', count: 1 },
        { type: 'deliver_order' },
      ],
    }).replace(/'/g, "''");

    const modifyConfig = JSON.stringify({
      theme: 'pizza',
      targetFraction: { numerator: 1, denominator: 4 },
      // Cartão errado de propósito (AC do nível Modify): corta em 3 partes
      // quando o pedido pede quartos — o aluno precisa perceber e corrigir
      // pra 4.
      presetSequence: [
        { type: 'choose_whole' },
        { type: 'cut_equal_parts', parts: 3 },
        { type: 'separate_pieces', count: 1 },
        { type: 'deliver_order' },
      ],
    }).replace(/'/g, "''");

    const createConfig = JSON.stringify({
      theme: 'garden',
      targetFraction: { numerator: 3, denominator: 4 },
      fractionPool: [
        { numerator: 1, denominator: 2 },
        { numerator: 1, denominator: 4 },
        { numerator: 3, denominator: 4 },
        { numerator: 1, denominator: 3 },
        { numerator: 2, denominator: 3 },
      ],
    }).replace(/'/g, "''");

    await queryRunner.query(`
      INSERT INTO "mini_game_levels" ("id", "conceptId", "stage", "position", "title", "prompt", "config") VALUES
      (uuid_generate_v4(), 'fractions_equal_parts', 'use', 1, 'Observe o pedido pronto', 'Um cliente pediu: separe metade (1/2) da barra de chocolate. Veja como a sequência de cartões resolve isso.', '${useConfig}'),
      (uuid_generate_v4(), 'fractions_equal_parts', 'modify', 2, 'Ajuste a sequência', 'Um cliente pediu: separe um quarto (1/4) da pizza. Algo na sequência não está certo — ajuste um cartão.', '${modifyConfig}'),
      (uuid_generate_v4(), 'fractions_equal_parts', 'create', 3, 'Monte o pedido do zero', 'Um cliente pediu: separe três quartos (3/4) do jardim. Monte a sequência de cartões você mesmo.', '${createConfig}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mini_game_levels" DROP CONSTRAINT "FK_mini_game_levels_updatedByUserId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_mini_game_levels_conceptId"`);
    await queryRunner.query(`DROP TABLE "mini_game_levels"`);
  }
}
