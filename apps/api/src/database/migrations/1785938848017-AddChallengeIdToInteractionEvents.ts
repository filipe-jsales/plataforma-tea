import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChallengeIdToInteractionEvents1785938848017 implements MigrationInterface {
    name = 'AddChallengeIdToInteractionEvents1785938848017'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "interaction_events" ADD "challengeId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_928b7392d595c9a6e3fa6bf61f" ON "interaction_events"  ("challengeId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_928b7392d595c9a6e3fa6bf61f"`);
        await queryRunner.query(`ALTER TABLE "interaction_events" DROP COLUMN "challengeId"`);
    }

}
