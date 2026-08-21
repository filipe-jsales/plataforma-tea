import { MigrationInterface, QueryRunner } from 'typeorm';

// 3.17 — configura o "modelo esperado" (cenário "Dia muito quente") no
// desafio 2.3 (create) da trilha "Estados da Matéria"
// (SeedEstadosDaMateriaCreateChallenge). Curado via migration, mesmo
// racional de "sem autoria de toolbox/campo pelo professor nesta versão"
// já documentado pra `allowedBlockTypes`/`editableFields` — um handler de
// template pro domínio `water_state` (professor escolhendo limiares numa
// tela) fica pra depois, ver docs/ai/modules/backend.md.
//
// Casos de teste evitam os limiares exatos (0°C/100°C) de propósito: bem
// dentro de cada faixa, sem depender de como o aluno decidiu tratar a
// fronteira (`>` estrito, ver waterProgram.ts) — o objetivo é medir se o
// programa cobre os 3 estados fisicamente, não pegar um aluno numa
// ambiguidade de comparação.
export class AddExpectedModelToWaterCreateChallenge1787315876833 implements MigrationInterface {
  name = 'AddExpectedModelToWaterCreateChallenge1787315876833';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          UPDATE "challenges"
          SET "config" = "config" || '{
            "expectedModel": {
              "scenarioLabel": "Dia muito quente",
              "testCases": [
                { "temperatureC": -20, "expectedState": "SOLID" },
                { "temperatureC": -5, "expectedState": "SOLID" },
                { "temperatureC": 5, "expectedState": "LIQUID" },
                { "temperatureC": 50, "expectedState": "LIQUID" },
                { "temperatureC": 95, "expectedState": "LIQUID" },
                { "temperatureC": 105, "expectedState": "GAS" },
                { "temperatureC": 150, "expectedState": "GAS" }
              ]
            }
          }'::jsonb
          WHERE "title" = 'Como a água muda de estado? — crie o seu!'
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
          UPDATE "challenges"
          SET "config" = "config" - 'expectedModel'
          WHERE "title" = 'Como a água muda de estado? — crie o seu!'
        `);
  }
}
