import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStudentChallengeDrafts1786368360888 implements MigrationInterface {
    name = 'CreateStudentChallengeDrafts1786368360888'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "student_challenge_drafts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "studentId" uuid NOT NULL, "challengeId" uuid NOT NULL, "workspaceJson" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0c04454e3cad696e653976d87dd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6b175eb85798e1caaf0eb84106" ON "student_challenge_drafts"  ("studentId", "challengeId") `);
        await queryRunner.query(`ALTER TABLE "student_challenge_drafts" ADD CONSTRAINT "FK_d5ccd233b28c74eca9d35a8bc21" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "student_challenge_drafts" ADD CONSTRAINT "FK_d9f2d1f5fb21da734a4c6a58d58" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "student_challenge_drafts" DROP CONSTRAINT "FK_d9f2d1f5fb21da734a4c6a58d58"`);
        await queryRunner.query(`ALTER TABLE "student_challenge_drafts" DROP CONSTRAINT "FK_d5ccd233b28c74eca9d35a8bc21"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b175eb85798e1caaf0eb84106"`);
        await queryRunner.query(`DROP TABLE "student_challenge_drafts"`);
    }

}
