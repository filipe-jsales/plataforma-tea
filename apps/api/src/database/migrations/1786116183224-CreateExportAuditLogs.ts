import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExportAuditLogs1786116183224 implements MigrationInterface {
  name = 'CreateExportAuditLogs1786116183224';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "export_audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "adminUserId" uuid, "filters" jsonb NOT NULL, "rowCount" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9d2363561cee93bc33ee9d9d710" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_70aa056934a3df1a9f9779d6a2" ON "export_audit_logs"  ("adminUserId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "export_audit_logs" ADD CONSTRAINT "FK_1e7e5a461ef1f58423e16001972" FOREIGN KEY ("adminUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "export_audit_logs" DROP CONSTRAINT "FK_1e7e5a461ef1f58423e16001972"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_70aa056934a3df1a9f9779d6a2"`,
    );
    await queryRunner.query(`DROP TABLE "export_audit_logs"`);
  }
}
