import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChallengeTemplatesAndTeacherAuthoring1786125053829 implements MigrationInterface {
    name = 'CreateChallengeTemplatesAndTeacherAuthoring1786125053829'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "challenge_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(60) NOT NULL, "name" character varying(150) NOT NULL, "description" text NOT NULL, "icon" character varying(8) NOT NULL, "topicId" uuid NOT NULL, "parameterSchema" jsonb NOT NULL, "position" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_129602e8403a545c9797f1e2cde" UNIQUE ("key"), CONSTRAINT "PK_5c05c17a1dabb56998f902ef83f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "challenges" ADD "templateId" uuid`);
        await queryRunner.query(`ALTER TABLE "challenges" ADD "templateParams" jsonb`);
        await queryRunner.query(`ALTER TABLE "challenges" ADD "createdByUserId" uuid`);
        await queryRunner.query(`ALTER TABLE "challenge_templates" ADD CONSTRAINT "FK_14c03014e5ae98ba44ece147d28" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "challenges" ADD CONSTRAINT "FK_cf1f4bbb5c51a275e91f8cf698e" FOREIGN KEY ("templateId") REFERENCES "challenge_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "challenges" ADD CONSTRAINT "FK_157be14dcc757083bdff3ae57a8" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

        // Seed manual (4.2) — 1 template MVP pro tópico `angulos_formas`,
        // mesmo padrão de CreateChallenges/CreateBlocks (schema gerado +
        // seed escrito à mão, ver docs/ai/modules/database.md). `INSERT`
        // puro não aciona @BeforeInsert, mas ChallengeTemplate não tem
        // nenhum, então não há valor gerado em runtime pra replicar aqui.
        //
        // `parameterSchema` cobre os 4 parâmetros pedagógicos do card (nº de
        // lados, ângulo de giro, tolerância de encaixe, paleta de blocos
        // habilitada). `candidateBlockTypes` dos blocos são os 3 já
        // semeados em CreateBlocks — todos aparecem em "Monte o quadrado"
        // (position 1, stage 'use'), então já satisfazem a regra de
        // progressão Use-Modify-Create antes mesmo de qualquer professor
        // usar o template. `defaultValue` sides=4/turnAngleDeg=90 replica o
        // mesmo desenho do desafio seed "Monte o quadrado" (4×90=360,
        // fecha), um ponto de partida já validado.
        await queryRunner.query(`
            INSERT INTO "challenge_templates" ("key", "name", "description", "icon", "topicId", "position", "parameterSchema")
            SELECT
                'regular_polygon',
                'Desenhar um polígono regular',
                'O aluno monta um desenho com um número de lados escolhido por você — como o quadrado do primeiro desafio, mas com o formato que você definir.',
                '🔷',
                "id",
                1,
                '[
                    {
                        "key": "sides",
                        "label": "Número de lados",
                        "icon": "🔺",
                        "type": "integer",
                        "helpText": "Quantos lados a figura vai ter.",
                        "min": 3,
                        "max": 12,
                        "defaultValue": 4,
                        "visualPreview": "polygonSides"
                    },
                    {
                        "key": "turnAngleDeg",
                        "label": "Ângulo de giro em cada lado",
                        "icon": "📐",
                        "type": "integer",
                        "helpText": "Quanto o personagem gira antes de desenhar o próximo lado. Para o desenho fechar, o número de lados multiplicado pelo ângulo precisa somar 360° (ex.: 4 lados × 90°).",
                        "min": 1,
                        "max": 359,
                        "defaultValue": 90,
                        "visualPreview": "angleWedge"
                    },
                    {
                        "key": "snapTolerancePercent",
                        "label": "Tolerância de encaixe dos blocos",
                        "icon": "🧲",
                        "type": "percentage",
                        "helpText": "Quão fácil é encaixar um bloco no lugar certo. Valores mais altos ajudam alunos com dificuldade de coordenação motora fina.",
                        "min": 10,
                        "max": 100,
                        "defaultValue": 60,
                        "visualPreview": "toleranceGauge"
                    },
                    {
                        "key": "enabledBlockTypes",
                        "label": "Blocos disponíveis para este desafio",
                        "icon": "🧩",
                        "type": "blockSelection",
                        "helpText": "Escolha quais blocos o aluno pode usar para montar o desenho.",
                        "defaultValue": ["move_forward", "turn", "repeat_times"],
                        "visualPreview": "none",
                        "candidateBlockTypes": ["move_forward", "turn", "repeat_times"]
                    }
                ]'::jsonb
            FROM "topics" WHERE "slug" = 'angulos_formas'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "challenge_templates" WHERE "key" = 'regular_polygon'`);
        await queryRunner.query(`ALTER TABLE "challenges" DROP CONSTRAINT "FK_157be14dcc757083bdff3ae57a8"`);
        await queryRunner.query(`ALTER TABLE "challenges" DROP CONSTRAINT "FK_cf1f4bbb5c51a275e91f8cf698e"`);
        await queryRunner.query(`ALTER TABLE "challenge_templates" DROP CONSTRAINT "FK_14c03014e5ae98ba44ece147d28"`);
        await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN "createdByUserId"`);
        await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN "templateParams"`);
        await queryRunner.query(`ALTER TABLE "challenges" DROP COLUMN "templateId"`);
        await queryRunner.query(`DROP TABLE "challenge_templates"`);
    }

}
