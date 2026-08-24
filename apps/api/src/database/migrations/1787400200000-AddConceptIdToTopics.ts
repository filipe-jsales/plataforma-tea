import { MigrationInterface, QueryRunner } from 'typeorm';

// MJ8 — vínculo conceito-currículo entre o desafio de blocos e o mini jogo
// equivalente sobre o mesmo assunto (ver docs/ai/backlog/
// mini-jogos-serios.md → MJ8). `mini_game_levels.conceptId` já existe
// (string livre, ver CreateMiniGameLevels); esta coluna é o lado que
// faltava — nullable, sem valor de seed pra nenhum tópico hoje (nenhum
// tópico de blocos cadastrado usa o mesmo assunto do mini jogo de frações
// ainda), mesmo padrão de "coluna que referencia um vínculo que ainda não
// tem dado real dos dois lados nasce nullable" já documentado em
// docs/ai/rules/coding-rule.md.
export class AddConceptIdToTopics1787400200000 implements MigrationInterface {
  name = 'AddConceptIdToTopics1787400200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "topics" ADD "conceptId" character varying(100)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_topics_conceptId" ON "topics" ("conceptId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_topics_conceptId"`);
    await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "conceptId"`);
  }
}
