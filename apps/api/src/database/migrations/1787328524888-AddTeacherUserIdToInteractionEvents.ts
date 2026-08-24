import { MigrationInterface, QueryRunner } from "typeorm";

// 7.5 — eventos de AUTORIA de currículo pelo professor (ex.:
// `challenge_primm_questions_configured`, ver ChallengeTemplatesService)
// precisam de uma coluna de identidade PRÓPRIA — `studentPseudoId` é
// documentado como "nunca o id reversível do aluno, sempre o pseudônimo",
// e um professor não é pseudonimizado (regra não-negociável 8 só cobre
// dado de ALUNO). Reaproveitar `studentPseudoId` pro id real do professor
// contaminaria qualquer contagem/exportação que assume "toda linha desta
// tabela = 1 pseudônimo de aluno" (`countDistinctStudentsActiveSince`,
// exportação 6.6). `studentPseudoId` vira nullable pra permitir a linha
// "só professor" — o endpoint público `POST /events` (aluno) continua
// exigindo o campo via `CreateEventDto`, inalterado; só a query interna
// muda.
export class AddTeacherUserIdToInteractionEvents1787328524888 implements MigrationInterface {
    name = 'AddTeacherUserIdToInteractionEvents1787328524888'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "interaction_events" ALTER COLUMN "studentPseudoId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "interaction_events" ADD "teacherUserId" uuid`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "interaction_events" DROP COLUMN "teacherUserId"`);
        await queryRunner.query(`ALTER TABLE "interaction_events" ALTER COLUMN "studentPseudoId" SET NOT NULL`);
    }

}
