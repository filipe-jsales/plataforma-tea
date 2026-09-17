import { MigrationInterface, QueryRunner } from "typeorm";

// Gerado via `migration:generate` e depois PODADO à mão: o diff bruto
// também trazia um monte de rename/recriação de constraint em tabelas não
// relacionadas (`class_comparison_setting_logs`, `mini_game_levels`,
// `interaction_events`, enum de `admin_action_logs`) — drift pré-existente
// entre nomes de constraint explícitos de migrations antigas e o que o
// TypeORM geraria hoje, nada a ver com esta feature. Mantido aqui só o que
// cria `survey_responses` de verdade.
export class CreateSurveyResponses1789664660258 implements MigrationInterface {
    name = 'CreateSurveyResponses1789664660258'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "survey_responses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "surveyKey" character varying(60) NOT NULL, "teacherUserId" uuid, "challengeId" uuid, "templateKey" character varying(60), "status" character varying(20) NOT NULL, "quantitative" jsonb NOT NULL DEFAULT '{}', "qualitative" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_349995c51959d139d8e485a58ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_abd7f2841768a518b6045fd41e" ON "survey_responses"  ("surveyKey", "createdAt") `);
        await queryRunner.query(`ALTER TABLE "survey_responses" ADD CONSTRAINT "FK_f08aed25ad5bb34d382c5a73217" FOREIGN KEY ("teacherUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "survey_responses" ADD CONSTRAINT "FK_c871c67641bb646f5fcb8e9e8ab" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "survey_responses" DROP CONSTRAINT "FK_c871c67641bb646f5fcb8e9e8ab"`);
        await queryRunner.query(`ALTER TABLE "survey_responses" DROP CONSTRAINT "FK_f08aed25ad5bb34d382c5a73217"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_abd7f2841768a518b6045fd41e"`);
        await queryRunner.query(`DROP TABLE "survey_responses"`);
    }

}
