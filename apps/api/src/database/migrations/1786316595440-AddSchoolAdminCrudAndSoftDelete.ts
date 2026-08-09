import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchoolAdminCrudAndSoftDelete1786316595440 implements MigrationInterface {
  name = 'AddSchoolAdminCrudAndSoftDelete1786316595440';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "schools" ADD "deletedAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "schools" ADD "deletedByUserId" uuid`);
    await queryRunner.query(
      `ALTER TABLE "schools" ADD "externalId" character varying(40)`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD "deletedAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD "deletedByUserId" uuid`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2763cb5714ae6688f920e48ada" ON "schools"  ("externalId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2763cb5714ae6688f920e48ada"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" DROP COLUMN "deletedByUserId"`,
    );
    await queryRunner.query(`ALTER TABLE "classrooms" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "schools" DROP COLUMN "externalId"`);
    await queryRunner.query(
      `ALTER TABLE "schools" DROP COLUMN "deletedByUserId"`,
    );
    await queryRunner.query(`ALTER TABLE "schools" DROP COLUMN "deletedAt"`);
  }
}
