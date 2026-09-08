import { MigrationInterface, QueryRunner } from 'typeorm';

// 4.3/7.3 — toggle explícito do professor pra habilitar comparação
// agregada/anônima entre alunos da turma (regra não-negociável 5: nunca
// ranking por padrão, só com ativação explícita). `comparisonEnabled` nasce
// `false` em toda turma (nova ou já existente — DEFAULT cobre o backfill).
//
// `class_comparison_setting_logs` é uma tabela de auditoria dedicada, fora
// de `interaction_events` de propósito: esta é uma ação de PROFESSOR sobre
// a turma, não uma interação de aluno (`interaction_events.studentPseudoId`
// é NOT NULL por design — ver "Padrão: eventos RD-* são escopados ao
// aluno" em docs/ai/modules/backend.md). Mesmo racional de
// `admin_action_logs`/`export_audit_logs` (AuditModule): "quem fez o quê,
// quando" de staff vira log próprio, nunca um evento RD-* forjado.
export class AddClassComparisonSetting1787500000000
  implements MigrationInterface
{
  name = 'AddClassComparisonSetting1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD "comparisonEnabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE TABLE "class_comparison_setting_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "classroomId" uuid, "enabled" boolean NOT NULL, "changedByUserId" uuid, "changedByRole" "public"."admin_action_logs_actorrole_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_class_comparison_setting_logs" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_class_comparison_setting_logs_classroomId" ON "class_comparison_setting_logs" ("classroomId", "createdAt")`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_comparison_setting_logs" ADD CONSTRAINT "FK_class_comparison_setting_logs_classroomId" FOREIGN KEY ("classroomId") REFERENCES "classrooms"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_comparison_setting_logs" ADD CONSTRAINT "FK_class_comparison_setting_logs_changedByUserId" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "class_comparison_setting_logs" DROP CONSTRAINT "FK_class_comparison_setting_logs_changedByUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_comparison_setting_logs" DROP CONSTRAINT "FK_class_comparison_setting_logs_classroomId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_class_comparison_setting_logs_classroomId"`,
    );
    await queryRunner.query(`DROP TABLE "class_comparison_setting_logs"`);
    await queryRunner.query(
      `ALTER TABLE "classrooms" DROP COLUMN "comparisonEnabled"`,
    );
  }
}
