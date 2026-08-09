import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserStatusAndAdminActionLogs1786278462809 implements MigrationInterface {
  name = 'AddUserStatusAndAdminActionLogs1786278462809';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."admin_action_logs_actorrole_enum" AS ENUM('student', 'teacher', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."admin_action_logs_targetrole_enum" AS ENUM('student', 'teacher', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "admin_action_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actorUserId" uuid, "actorRole" "public"."admin_action_logs_actorrole_enum" NOT NULL, "actionType" character varying(40) NOT NULL, "targetUserId" uuid, "targetRole" "public"."admin_action_logs_targetrole_enum" NOT NULL, "metadata" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1cbd6d5a6c8cc626adaa7655bc4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1c739000570fa78b339e8595dc" ON "admin_action_logs"  ("actorUserId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "passwordSetupToken" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "passwordSetupTokenExpiresAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_action_logs" ADD CONSTRAINT "FK_a0ed513756e46ba41be48dd63da" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_action_logs" ADD CONSTRAINT "FK_bed338d04f6d6cc68655528f576" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "admin_action_logs" DROP CONSTRAINT "FK_bed338d04f6d6cc68655528f576"`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_action_logs" DROP CONSTRAINT "FK_a0ed513756e46ba41be48dd63da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "passwordSetupTokenExpiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "passwordSetupToken"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "active"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1c739000570fa78b339e8595dc"`,
    );
    await queryRunner.query(`DROP TABLE "admin_action_logs"`);
    await queryRunner.query(
      `DROP TYPE "public"."admin_action_logs_targetrole_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."admin_action_logs_actorrole_enum"`,
    );
  }
}
