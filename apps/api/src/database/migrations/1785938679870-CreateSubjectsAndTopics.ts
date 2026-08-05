import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSubjectsAndTopics1785938679870 implements MigrationInterface {
    name = 'CreateSubjectsAndTopics1785938679870'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // As duas linhas de índice de "interaction_events"/"users" abaixo não são
        // sobre subjects/topics: reconciliam o nome do índice/constraint que a
        // migration inicial (escrita à mão) usou com a convenção de nomes
        // auto-gerados do TypeORM — mesmo schema, sem mudança de comportamento.
        await queryRunner.query(`DROP INDEX "public"."IDX_interaction_events_student_created"`);
        await queryRunner.query(`CREATE TABLE "subjects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying(80) NOT NULL, "name" character varying(120) NOT NULL, "description" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_cdfc4aab59be2274562eb8e9d20" UNIQUE ("slug"), CONSTRAINT "PK_1a023685ac2b051b4e557b0b280" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cdfc4aab59be2274562eb8e9d2" ON "subjects"  ("slug") `);
        await queryRunner.query(`CREATE TABLE "topics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "subjectId" uuid NOT NULL, "slug" character varying(80) NOT NULL, "name" character varying(120) NOT NULL, "description" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e4aa99a3fa60ec3a37d1fc4e853" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_798a17044de61cb46d5d0ff31a" ON "topics"  ("subjectId", "slug") `);
        await queryRunner.query(`CREATE INDEX "IDX_a674e2101001d573662e3264af" ON "interaction_events"  ("studentPseudoId", "createdAt") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_11d4b6a64ea643d04e9375f6dc" ON "users"  ("pseudonymId") `);
        await queryRunner.query(`ALTER TABLE "topics" ADD CONSTRAINT "FK_38b54068d2482668ba8f81a59ae" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        // Seed do MVP: uma única disciplina/assunto (escopo do MVP), sem travar a
        // estrutura para crescer depois — ver docs/ai/modules/database.md.
        await queryRunner.query(`
          INSERT INTO "subjects" ("slug", "name", "description")
          VALUES ('geometria', 'Geometria', 'Geometria da educação básica — MVP: ângulos e formas')
        `);
        await queryRunner.query(`
          INSERT INTO "topics" ("subjectId", "slug", "name", "description")
          SELECT "id", 'angulos_formas', 'Ângulos e Formas', 'Reconhecimento e classificação de ângulos e formas geométricas básicas'
          FROM "subjects" WHERE "slug" = 'geometria'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "topics" WHERE "slug" = 'angulos_formas'`);
        await queryRunner.query(`DELETE FROM "subjects" WHERE "slug" = 'geometria'`);
        await queryRunner.query(`ALTER TABLE "topics" DROP CONSTRAINT "FK_38b54068d2482668ba8f81a59ae"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_11d4b6a64ea643d04e9375f6dc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a674e2101001d573662e3264af"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_798a17044de61cb46d5d0ff31a"`);
        await queryRunner.query(`DROP TABLE "topics"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cdfc4aab59be2274562eb8e9d2"`);
        await queryRunner.query(`DROP TABLE "subjects"`);
        await queryRunner.query(`CREATE INDEX "IDX_interaction_events_student_created" ON "interaction_events" USING btree ("studentPseudoId", "createdAt") `);
    }

}
