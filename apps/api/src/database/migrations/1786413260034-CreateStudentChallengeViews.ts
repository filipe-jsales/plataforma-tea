import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStudentChallengeViews1786413260034 implements MigrationInterface {
    name = 'CreateStudentChallengeViews1786413260034'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "student_challenge_views" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "studentId" uuid NOT NULL, "challengeId" uuid NOT NULL, "firstViewedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8e132e3282180e9210edd48afff" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_492141c37c204615e137fb6b19" ON "student_challenge_views"  ("studentId", "challengeId") `);
        await queryRunner.query(`ALTER TABLE "student_challenge_views" ADD CONSTRAINT "FK_9a2ce6291220eaa827ceacfd715" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "student_challenge_views" ADD CONSTRAINT "FK_ca989c28785b62be5539be3919d" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "student_challenge_views" DROP CONSTRAINT "FK_ca989c28785b62be5539be3919d"`);
        await queryRunner.query(`ALTER TABLE "student_challenge_views" DROP CONSTRAINT "FK_9a2ce6291220eaa827ceacfd715"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_492141c37c204615e137fb6b19"`);
        await queryRunner.query(`DROP TABLE "student_challenge_views"`);
    }

}
