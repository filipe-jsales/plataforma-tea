import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClosureToleranceToRegularPolygonTemplate1786282298140 implements MigrationInterface {
    name = 'AddClosureToleranceToRegularPolygonTemplate1786282298140'

    // 7.4 (AC3) — só um `UPDATE` sobre a linha já seedada em
    // CreateChallengeTemplatesAndTeacherAuthoring (sem mudança de schema,
    // `migration:generate` não geraria diff pra isto — mesmo racional de
    // SeedSquareChallengeToolbox). Acrescenta o parâmetro "margem de erro
    // pra considerar a forma fechada" ao formulário guiado do template
    // `regular_polygon` — o handler (RegularPolygonTemplateHandler) já
    // valida/consome `closureTolerancePx`; sem esta migration, o campo
    // nunca apareceria no formulário do professor (parameterSchema é dado,
    // não código, ver challenge-templates.service.ts).
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "challenge_templates"
            SET "parameterSchema" = "parameterSchema" || '[
                {
                    "key": "closureTolerancePx",
                    "label": "Margem de erro para considerar a forma fechada",
                    "icon": "🎯",
                    "type": "integer",
                    "helpText": "Quantos pixels de distância do ponto de partida ainda contam como \\"a forma fechou\\". Valores mais altos ajudam alunos com dificuldade de coordenação motora fina.",
                    "min": 1,
                    "max": 40,
                    "defaultValue": 5,
                    "visualPreview": "none"
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
                WHERE elem ->> 'key' != 'closureTolerancePx'
            )
            WHERE "key" = 'regular_polygon'
        `);
    }

}
