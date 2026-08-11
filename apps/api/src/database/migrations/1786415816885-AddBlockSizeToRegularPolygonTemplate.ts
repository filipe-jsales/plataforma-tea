import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBlockSizeToRegularPolygonTemplate1786415816885 implements MigrationInterface {
    name = 'AddBlockSizeToRegularPolygonTemplate1786415816885'

    // Só um `UPDATE` sobre a linha já seedada em
    // CreateChallengeTemplatesAndTeacherAuthoring (sem mudança de schema,
    // mesmo racional de AddClosureToleranceToRegularPolygonTemplate).
    // Acrescenta o parâmetro "tamanho dos blocos" ao formulário guiado do
    // template `regular_polygon` — 3 opções nomeadas (nunca um número de
    // escala cru, regra não-negociável 9), que o handler
    // (RegularPolygonTemplateHandler) já valida/converte pro fator de escala
    // consumido por ChallengePage.tsx (`zoom.startScale`). `defaultValue`
    // "medium" mantém o tamanho atual do editor pra qualquer desafio já
    // criado antes desta migration (parâmetro ausente no `templateParams`
    // salvo — o formulário de edição usa o default do schema pra
    // pré-preencher, ver TemplateChallengeForm.tsx).
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "challenge_templates"
            SET "parameterSchema" = "parameterSchema" || '[
                {
                    "key": "blockSize",
                    "label": "Tamanho dos blocos",
                    "icon": "🔍",
                    "type": "select",
                    "helpText": "Blocos maiores facilitam a leitura e o encaixe para quem tem dificuldade de coordenação motora fina.",
                    "defaultValue": "medium",
                    "visualPreview": "none",
                    "options": [
                        { "value": "small", "label": "Pequeno" },
                        { "value": "medium", "label": "Médio" },
                        { "value": "large", "label": "Grande" }
                    ]
                }
            ]'::jsonb
            WHERE "key" = 'regular_polygon'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "challenge_templates"
            SET "parameterSchema" = (
                SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
                FROM jsonb_array_elements("parameterSchema") elem
                WHERE elem ->> 'key' != 'blockSize'
            )
            WHERE "key" = 'regular_polygon'
        `);
    }

}
