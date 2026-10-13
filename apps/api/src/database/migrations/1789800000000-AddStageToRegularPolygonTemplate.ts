import { MigrationInterface, QueryRunner } from "typeorm";

// F13 - o professor passa a poder escolher a fase do ciclo Use-Modify-Create
// que está autorando com o template `regular_polygon`: "Montar do zero"
// (`create`, o que existia) ou "Mudar um programa pronto" (`modify`). Só um
// UPDATE sobre a linha seedada (sem mudança de schema, mesmo racional de
// AddBlockSizeToRegularPolygonTemplate).
//
// `stage` entra NA FRENTE da lista (é a primeira decisão do professor). Os
// dois campos que só fazem sentido ao montar do zero ganham `visibleWhen`
// pro formulário genérico escondê-los na fase Modify: sem paleta e com os
// blocos travados, não há blocos a escolher nem encaixe a tolerar.
// `defaultValue: "create"` mantém o comportamento de todo desafio já salvo.
export class AddStageToRegularPolygonTemplate1789800000000 implements MigrationInterface {
    name = 'AddStageToRegularPolygonTemplate1789800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "challenge_templates"
            SET "parameterSchema" = '[
                {
                    "key": "stage",
                    "label": "Tipo de atividade",
                    "icon": "",
                    "type": "select",
                    "helpText": "Montar do zero: o aluno monta o desenho com os blocos. Mudar um programa pronto: o programa já vem montado e o aluno só troca os números para ver o que acontece.",
                    "defaultValue": "create",
                    "visualPreview": "none",
                    "options": [
                        { "value": "create", "label": "Montar do zero" },
                        { "value": "modify", "label": "Mudar um programa pronto" }
                    ]
                }
            ]'::jsonb || COALESCE((
                SELECT jsonb_agg(
                    CASE
                        WHEN elem ->> 'key' IN ('enabledBlockTypes', 'snapTolerancePercent')
                        THEN elem || '{"visibleWhen": {"key": "stage", "equals": "create"}}'::jsonb
                        ELSE elem
                    END
                    ORDER BY ord
                )
                FROM jsonb_array_elements("parameterSchema") WITH ORDINALITY AS t(elem, ord)
            ), '[]'::jsonb)
            WHERE "key" = 'regular_polygon'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "challenge_templates"
            SET "parameterSchema" = COALESCE((
                SELECT jsonb_agg(elem - 'visibleWhen' ORDER BY ord)
                FROM jsonb_array_elements("parameterSchema") WITH ORDINALITY AS t(elem, ord)
                WHERE elem ->> 'key' != 'stage'
            ), '[]'::jsonb)
            WHERE "key" = 'regular_polygon'
        `);
    }

}
