import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLoginMechanisms1785942128821 implements MigrationInterface {
    name = 'AddLoginMechanisms1785942128821'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."illustrations_kind_enum" AS ENUM('avatar', 'login_image')`);
        await queryRunner.query(`CREATE TABLE "illustrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "kind" "public"."illustrations_kind_enum" NOT NULL, "slug" character varying(80) NOT NULL, "label" character varying(80) NOT NULL, "assetRef" character varying(120) NOT NULL, "position" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9fc561df43c64ce9f193f4ea64d" UNIQUE ("slug"), CONSTRAINT "PK_ec4a601172b41459d76aeb1f02f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9fc561df43c64ce9f193f4ea64" ON "illustrations"  ("slug") `);
        await queryRunner.query(`CREATE INDEX "IDX_acf90ff1b1ffb8f0c693e8ea40" ON "illustrations"  ("kind", "position") `);
        await queryRunner.query(`ALTER TABLE "users" ADD "totpSecret" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "avatarId" uuid`);
        await queryRunner.query(`ALTER TABLE "users" ADD "loginImageSequence" uuid array`);
        await queryRunner.query(`ALTER TABLE "classrooms" ADD "joinCode" character varying(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "classrooms" ADD CONSTRAINT "UQ_a9a20f01f8342dc6a4c726ea0d8" UNIQUE ("joinCode")`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a9a20f01f8342dc6a4c726ea0d" ON "classrooms"  ("joinCode") `);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_3e1f52ec904aed992472f2be147" FOREIGN KEY ("avatarId") REFERENCES "illustrations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

        // Seed de desenvolvimento (0.6 estendido): catálogo de ilustrações +
        // 1 turma + 3 contas demo (aluno/professor/admin) na Escola Exemplo,
        // pra dar pra testar os 3 fluxos de login ponta a ponta. Credenciais
        // documentadas em docs/ai/modules/database.md — NUNCA usar em produção.
        await queryRunner.query(`
          INSERT INTO "illustrations" ("kind", "slug", "label", "assetRef", "position") VALUES
            ('avatar', 'avatar-gato', 'Gato', 'avatar-cat', 0),
            ('avatar', 'avatar-cachorro', 'Cachorro', 'avatar-dog', 1),
            ('avatar', 'avatar-passaro', 'Pássaro', 'avatar-bird', 2),
            ('avatar', 'avatar-peixe', 'Peixe', 'avatar-fish', 3),
            ('login_image', 'login-sol', 'Sol', 'login-sun', 0),
            ('login_image', 'login-lua', 'Lua', 'login-moon', 1),
            ('login_image', 'login-estrela', 'Estrela', 'login-star', 2),
            ('login_image', 'login-arvore', 'Árvore', 'login-tree', 3)
        `);

        await queryRunner.query(`
          INSERT INTO "users" ("pseudonymId", "email", "passwordHash", "role", "displayName") VALUES
            (uuid_generate_v4(), 'professor.demo@escolaexemplo.test', '$2b$10$1BrgEPnSRG4h9MjnFO24aO4BCmD.AvUjtACypOn.YSazBSVtQ/HCi', 'teacher', 'Professor(a) Demo')
        `);
        await queryRunner.query(`
          INSERT INTO "users" ("pseudonymId", "email", "passwordHash", "totpSecret", "role", "displayName") VALUES
            (uuid_generate_v4(), 'admin.demo@plataforma-tea.test', '$2b$10$16loVwtcIXcu2zxCKw12XeAIh91LraRcgpHGFpzBwC1I4ob0W.oFW', '4PQTUDCGD7VD7ZMXKB5YLDAO5WO2QY6W', 'admin', 'Admin Demo')
        `);
        await queryRunner.query(`
          INSERT INTO "users" ("pseudonymId", "role", "displayName", "avatarId", "loginImageSequence") VALUES (
            uuid_generate_v4(),
            'student',
            'Aluno(a) Demo',
            (SELECT "id" FROM "illustrations" WHERE "slug" = 'avatar-gato'),
            ARRAY[
              (SELECT "id" FROM "illustrations" WHERE "slug" = 'login-sol'),
              (SELECT "id" FROM "illustrations" WHERE "slug" = 'login-lua'),
              (SELECT "id" FROM "illustrations" WHERE "slug" = 'login-estrela')
            ]::uuid[]
          )
        `);

        await queryRunner.query(`
          INSERT INTO "classrooms" ("schoolId", "teacherId", "name", "joinCode") VALUES (
            (SELECT "id" FROM "schools" WHERE "name" = 'Escola Exemplo'),
            (SELECT "id" FROM "users" WHERE "email" = 'professor.demo@escolaexemplo.test'),
            'Turma Demo',
            'AZUL-1'
          )
        `);
        await queryRunner.query(`
          INSERT INTO "enrollments" ("studentId", "classroomId") VALUES (
            (SELECT "id" FROM "users" WHERE "displayName" = 'Aluno(a) Demo'),
            (SELECT "id" FROM "classrooms" WHERE "joinCode" = 'AZUL-1')
          )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "enrollments" WHERE "classroomId" = (SELECT "id" FROM "classrooms" WHERE "joinCode" = 'AZUL-1')`);
        await queryRunner.query(`DELETE FROM "classrooms" WHERE "joinCode" = 'AZUL-1'`);
        await queryRunner.query(`DELETE FROM "users" WHERE "email" IN ('professor.demo@escolaexemplo.test', 'admin.demo@plataforma-tea.test') OR "displayName" = 'Aluno(a) Demo'`);

        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_3e1f52ec904aed992472f2be147"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a9a20f01f8342dc6a4c726ea0d"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "passwordHash" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "classrooms" DROP CONSTRAINT "UQ_a9a20f01f8342dc6a4c726ea0d8"`);
        await queryRunner.query(`ALTER TABLE "classrooms" DROP COLUMN "joinCode"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "loginImageSequence"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatarId"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "totpSecret"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_acf90ff1b1ffb8f0c693e8ea40"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9fc561df43c64ce9f193f4ea64"`);
        await queryRunner.query(`DROP TABLE "illustrations"`);
        await queryRunner.query(`DROP TYPE "public"."illustrations_kind_enum"`);
    }

}
