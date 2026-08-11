import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedEstadosDaMateriaTopic1786447935127 implements MigrationInterface {
    name = 'SeedEstadosDaMateriaTopic1786447935127'

    // 3.13/3.14/3.16 — primeiro tópico do domínio `water_state`
    // (WaterStateChallengePage, ver AddDomainToTopics), consumindo o bloco
    // condicional (3.12, `conditional_if`) + a ação `set_water_state`
    // (CreateSetWaterStateBlock, migration anterior) pela primeira vez.
    //
    // Os 2 desafios (`use`/`modify`) usam o MESMO `program` — um único
    // `conditional_if` (limiar de ebulição, 100°C) com `set_water_state`
    // em cada ramo. Decisão deliberada (ver conversa/plano): um desenho
    // inicial com 2 `conditional_if` aninhados (congelamento + ebulição) no
    // desafio `modify` foi descartado porque `extractEditableFieldValues`
    // (apps/web/src/lib/editableFields.ts) indexa o valor só por
    // `fieldName`, não por instância do bloco — 2 THRESHOLD no mesmo
    // programa colidiriam silenciosamente no log de `changed_values`. Por
    // isso o desafio 2.2 fala em "limiar de ebulição", não "de
    // congelamento" — estado intermediário de propósito (mesmo racional de
    // `SeedUseModifyCreateSequence`, que documenta a falta do `modify` na
    // sequência original), não uma trilha final validada.
    //
    // `goal` aqui não é meta de fechamento geométrico (como no domínio de
    // tartaruga) — é o cenário inicial que a página lê pra popular o slider
    // de temperatura (`initialTemperatureC`) e o range pedagógico
    // (`boilingThresholdC`, valor de referência pra UI, o limiar real
    // executado é sempre o do `program`).
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          INSERT INTO "subjects" ("slug", "name", "description")
          VALUES ('ciencias', 'Ciências', 'Ciências da educação básica — MVP: estados físicos da matéria')
        `);
        await queryRunner.query(`
          INSERT INTO "topics" ("subjectId", "slug", "name", "description", "domain")
          SELECT "id", 'estados_da_materia', 'Estados da Matéria',
            'Como a temperatura muda o estado físico da água', 'water_state'
          FROM "subjects" WHERE "slug" = 'ciencias'
        `);

        await queryRunner.query(`
          INSERT INTO "challenges" ("topicId", "title", "prompt", "position", "config")
          SELECT
            "id",
            'Como a água muda de estado?',
            'Observe o programa: ele decide se a água vira vapor ou continua líquida, dependendo da temperatura.',
            1,
            '{
              "stage": "use",
              "allowedBlockTypes": ["conditional_if", "set_water_state"],
              "goal": { "initialTemperatureC": 20, "boilingThresholdC": 100 },
              "program": {
                "type": "conditional_if",
                "fields": { "THRESHOLD": 100 },
                "inputs": {
                  "DO_THEN": { "block": { "type": "set_water_state", "fields": { "STATE": "GAS" } } },
                  "DO_ELSE": { "block": { "type": "set_water_state", "fields": { "STATE": "LIQUID" } } }
                }
              },
              "predictQuestion": "Em que estado a água vai ficar nessa temperatura?"
            }'::jsonb
          FROM "topics" WHERE "slug" = 'estados_da_materia'
        `);

        await queryRunner.query(`
          INSERT INTO "challenges" ("topicId", "title", "prompt", "position", "config")
          SELECT
            "id",
            'Como a água muda de estado? — agora mude!',
            'Esse é o mesmo programa do desafio anterior — mas agora você pode mudar o limiar de ebulição. Tente descobrir o que acontece se a água ferver em outra temperatura!',
            2,
            '{
              "stage": "modify",
              "allowedBlockTypes": ["conditional_if", "set_water_state"],
              "goal": { "initialTemperatureC": 20, "boilingThresholdC": 100 },
              "program": {
                "type": "conditional_if",
                "fields": { "THRESHOLD": 100 },
                "inputs": {
                  "DO_THEN": { "block": { "type": "set_water_state", "fields": { "STATE": "GAS" } } },
                  "DO_ELSE": { "block": { "type": "set_water_state", "fields": { "STATE": "LIQUID" } } }
                }
              },
              "predictQuestion": "Em que estado a água vai ficar nessa temperatura?",
              "editableFields": [
                { "blockType": "conditional_if", "fieldName": "THRESHOLD", "label": "Limiar de ebulição (°C)", "min": 80, "max": 120 }
              ]
            }'::jsonb
          FROM "topics" WHERE "slug" = 'estados_da_materia'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "challenges" WHERE "title" IN ('Como a água muda de estado?', 'Como a água muda de estado? — agora mude!')`);
        await queryRunner.query(`DELETE FROM "topics" WHERE "slug" = 'estados_da_materia'`);
        await queryRunner.query(`DELETE FROM "subjects" WHERE "slug" = 'ciencias'`);
    }

}
