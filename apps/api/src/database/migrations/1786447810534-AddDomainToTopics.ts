import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDomainToTopics1786447810534 implements MigrationInterface {
    name = 'AddDomainToTopics1786447810534'

    // 3.13/3.14/3.16 — primeira vez que um segundo domínio de frontend
    // (WaterStateChallengePage, trilha "Estados da Matéria") existe além do
    // mundo de tartaruga original (ChallengePage). `default` cobre o tópico
    // já seedado (`angulos_formas`) sem precisar de um segundo UPDATE —
    // continua `'blocks_turtle'` sem nada mudar pra ele.
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "topics" ADD "domain" character varying(40) NOT NULL DEFAULT 'blocks_turtle'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "topics" DROP COLUMN "domain"`);
    }

}
