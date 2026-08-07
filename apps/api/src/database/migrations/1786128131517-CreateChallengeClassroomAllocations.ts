import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChallengeClassroomAllocations1786128131517 implements MigrationInterface {
    name = 'CreateChallengeClassroomAllocations1786128131517'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "challenge_classroom_allocations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "challengeId" uuid NOT NULL, "classroomId" uuid NOT NULL, "allocatedByUserId" uuid, "allocatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d13f048437d032831959c43bcc0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_808ba25db12250f0f5d9046749" ON "challenge_classroom_allocations"  ("challengeId", "classroomId") `);
        await queryRunner.query(`ALTER TABLE "challenge_classroom_allocations" ADD CONSTRAINT "FK_6702c01d0f8b25a95de4badbe33" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "challenge_classroom_allocations" ADD CONSTRAINT "FK_000581b8b97880005c993011830" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "challenge_classroom_allocations" ADD CONSTRAINT "FK_ac456419eddc83669468a4e7fad" FOREIGN KEY ("allocatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "challenge_classroom_allocations" DROP CONSTRAINT "FK_ac456419eddc83669468a4e7fad"`);
        await queryRunner.query(`ALTER TABLE "challenge_classroom_allocations" DROP CONSTRAINT "FK_000581b8b97880005c993011830"`);
        await queryRunner.query(`ALTER TABLE "challenge_classroom_allocations" DROP CONSTRAINT "FK_6702c01d0f8b25a95de4badbe33"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_808ba25db12250f0f5d9046749"`);
        await queryRunner.query(`DROP TABLE "challenge_classroom_allocations"`);
    }

}
