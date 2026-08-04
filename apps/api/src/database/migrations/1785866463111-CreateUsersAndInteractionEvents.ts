import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndInteractionEvents1785866463111 implements MigrationInterface {
  name = 'CreateUsersAndInteractionEvents1785866463111';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('student', 'teacher', 'admin')`,
    );
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "pseudonymId" character varying(64) NOT NULL,
        "schoolReversibleRef" character varying(128),
        "email" character varying(180) NOT NULL,
        "passwordHash" character varying NOT NULL,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'student',
        "displayName" character varying(120) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_pseudonymId" UNIQUE ("pseudonymId"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE TYPE "public"."interaction_events_category_enum" AS ENUM('RD-I', 'RD-P', 'RD-C', 'RD-E', 'RD-L')`,
    );
    await queryRunner.query(`
      CREATE TABLE "interaction_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "studentPseudoId" character varying(64) NOT NULL,
        "category" "public"."interaction_events_category_enum" NOT NULL,
        "type" character varying(80) NOT NULL,
        "payload" jsonb NOT NULL DEFAULT '{}',
        "sessionId" character varying(64),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_interaction_events_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_interaction_events_student_created" ON "interaction_events" ("studentPseudoId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_interaction_events_student_created"`);
    await queryRunner.query(`DROP TABLE "interaction_events"`);
    await queryRunner.query(`DROP TYPE "public"."interaction_events_category_enum"`);

    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
