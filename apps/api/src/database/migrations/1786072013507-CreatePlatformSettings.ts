import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePlatformSettings1786072013507 implements MigrationInterface {
    name = 'CreatePlatformSettings1786072013507'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "platform_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "minSampleSizeThreshold" integer NOT NULL DEFAULT '5', "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2934aeb70ec285196dcab4a2e96" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "platform_settings"`);
    }

}
