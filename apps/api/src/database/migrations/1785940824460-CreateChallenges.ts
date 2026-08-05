import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChallenges1785940824460 implements MigrationInterface {
    name = 'CreateChallenges1785940824460'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "challenges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "topicId" uuid NOT NULL, "title" character varying(150) NOT NULL, "prompt" text NOT NULL, "config" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1e664e93171e20fe4d6125466af" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "challenges" ADD CONSTRAINT "FK_252a66b40af4bcd6f14df20a7ae" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "interaction_events" ADD CONSTRAINT "FK_928b7392d595c9a6e3fa6bf61f0" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

        // Seed do MVP (0.6): 1 desafio de geometria + 1 escola de exemplo —
        // ver docs/ai/modules/database.md.
        await queryRunner.query(`
          INSERT INTO "challenges" ("topicId", "title", "prompt")
          SELECT "id", 'Monte o quadrado', 'Encaixe os blocos para desenhar um quadrado na tela.'
          FROM "topics" WHERE "slug" = 'angulos_formas'
        `);
        await queryRunner.query(`
          INSERT INTO "schools" ("name") VALUES ('Escola Exemplo')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "schools" WHERE "name" = 'Escola Exemplo'`);
        await queryRunner.query(`DELETE FROM "challenges" WHERE "title" = 'Monte o quadrado'`);
        await queryRunner.query(`ALTER TABLE "interaction_events" DROP CONSTRAINT "FK_928b7392d595c9a6e3fa6bf61f0"`);
        await queryRunner.query(`ALTER TABLE "challenges" DROP CONSTRAINT "FK_252a66b40af4bcd6f14df20a7ae"`);
        await queryRunner.query(`DROP TABLE "challenges"`);
    }

}
