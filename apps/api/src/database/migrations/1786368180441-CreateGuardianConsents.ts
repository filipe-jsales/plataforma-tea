import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGuardianConsents1786368180441 implements MigrationInterface {
    name = 'CreateGuardianConsents1786368180441'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "guardian_consents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "studentId" uuid NOT NULL, "guardianName" character varying(120) NOT NULL, "guardianRelationship" character varying(60) NOT NULL, "guardianContact" character varying(180) NOT NULL, "consentedAt" TIMESTAMP NOT NULL, "collectedByUserId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ea3e59ff30048f85b215cb5fc7d" UNIQUE ("studentId"), CONSTRAINT "PK_d37b04a1b5ec78724dfd0b39ead" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ea3e59ff30048f85b215cb5fc7" ON "guardian_consents"  ("studentId") `);
        await queryRunner.query(`ALTER TABLE "guardian_consents" ADD CONSTRAINT "FK_ea3e59ff30048f85b215cb5fc7d" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "guardian_consents" ADD CONSTRAINT "FK_fb8b04d91dd76606a84e291341d" FOREIGN KEY ("collectedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

        // A2 — backfill do aluno demo (seed em AddLoginMechanisms, antes
        // desta feature existir): sem isto, a conta demo ficaria travada
        // fora do login (active já é `true` nela desde a criação, mas o
        // novo endpoint de nova tentativa de ativação e a tela de auditoria
        // do admin passariam a mostrar "consentimento pendente" pra uma
        // conta que já era utilizável antes de A2 existir). Isto é
        // grandfathering explícito de uma conta pré-existente — a
        // VALIDAÇÃO real do fluxo (AC5) usa um aluno novo passando pelos 2
        // passos de verdade, nunca este backfill como atalho.
        await queryRunner.query(`
          INSERT INTO "guardian_consents" ("studentId", "guardianName", "guardianRelationship", "guardianContact", "consentedAt", "collectedByUserId")
          SELECT
            (SELECT "id" FROM "users" WHERE "displayName" = 'Aluno(a) Demo' AND "role" = 'student'),
            'Responsável Demo',
            'Responsável legal',
            'responsavel.demo@escolaexemplo.test',
            now(),
            (SELECT "id" FROM "users" WHERE "email" = 'admin.demo@plataforma-tea.test')
          WHERE EXISTS (SELECT 1 FROM "users" WHERE "displayName" = 'Aluno(a) Demo' AND "role" = 'student')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "guardian_consents" WHERE "studentId" = (SELECT "id" FROM "users" WHERE "displayName" = 'Aluno(a) Demo' AND "role" = 'student')`);
        await queryRunner.query(`ALTER TABLE "guardian_consents" DROP CONSTRAINT "FK_fb8b04d91dd76606a84e291341d"`);
        await queryRunner.query(`ALTER TABLE "guardian_consents" DROP CONSTRAINT "FK_ea3e59ff30048f85b215cb5fc7d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ea3e59ff30048f85b215cb5fc7"`);
        await queryRunner.query(`DROP TABLE "guardian_consents"`);
    }

}
