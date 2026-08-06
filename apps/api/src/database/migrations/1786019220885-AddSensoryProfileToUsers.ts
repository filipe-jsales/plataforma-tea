import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSensoryProfileToUsers1786019220885 implements MigrationInterface {
    name = 'AddSensoryProfileToUsers1786019220885'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "soundEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "animationEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "sensoryOnboardingCompletedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "sensoryOnboardingCompletedAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "animationEnabled"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "soundEnabled"`);
    }

}
