import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPositionToChallenges1786032598196 implements MigrationInterface {
    name = 'AddPositionToChallenges1786032598196'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Nullable primeiro: a tabela já tem linha(s) (seed do MVP) e não há
        // um default óbvio de schema pra `position` (é ordem pedagógica
        // curada por conteúdo, não um autoincrement). Backfill explícito
        // antes de travar NOT NULL.
        await queryRunner.query(`ALTER TABLE "challenges" ADD "position" integer`);
        await queryRunner.query(`UPDATE "challenges" SET "position" = 1 WHERE "position" IS NULL`);
        await queryRunner.query(`ALTER TABLE "challenges" ALTER COLUMN "position" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN "position"`);
    }

}
