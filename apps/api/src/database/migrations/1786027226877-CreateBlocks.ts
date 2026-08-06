import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBlocks1786027226877 implements MigrationInterface {
    name = 'CreateBlocks1786027226877'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "blocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "blockType" character varying(80) NOT NULL, "label" character varying(120) NOT NULL, "category" character varying(60) NOT NULL, "categoryLabel" character varying(60) NOT NULL, "colour" integer NOT NULL, "position" integer NOT NULL, "blocklyJson" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3811a639db7fc88ecfd2da9a437" UNIQUE ("blockType"), CONSTRAINT "PK_8244fa1495c4e9222a01059244b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3811a639db7fc88ecfd2da9a43" ON "blocks"  ("blockType") `);
        await queryRunner.query(`CREATE INDEX "IDX_7a018348a866199f886fab6c84" ON "blocks"  ("category", "position") `);

        // Seed da paleta MVP (feature "blocos por desafio", RQ4): 3 blocos —
        // mover, girar, repetir — o suficiente para o aluno desenhar um
        // quadrado (4x mover+girar 90°, ou 1x repetir 4 vezes). Mesma cor por
        // categoria (movimento/controle), nunca por bloco individual — a
        // paleta agrupa visualmente por categoria (AC5), ver
        // ChallengesController.groupByCategory. `blocklyJson` é o formato de
        // Blockly.defineBlocksWithJsonArray; o frontend nunca hardcoda a
        // forma do bloco, registra isso em runtime.
        await queryRunner.query(`
          INSERT INTO "blocks" ("blockType", "label", "category", "categoryLabel", "colour", "position", "blocklyJson") VALUES
          (
            'move_forward',
            'mover para frente',
            'movimento',
            'Movimento',
            200,
            0,
            '{"type":"move_forward","message0":"mover para frente","previousStatement":null,"nextStatement":null,"colour":200,"tooltip":"Move o personagem um passo para frente"}'::jsonb
          ),
          (
            'turn',
            'girar',
            'movimento',
            'Movimento',
            200,
            1,
            '{"type":"turn","message0":"girar %1","args0":[{"type":"field_dropdown","name":"DIR","options":[["para a direita","RIGHT"],["para a esquerda","LEFT"]]}],"previousStatement":null,"nextStatement":null,"colour":200,"tooltip":"Gira o personagem 90 graus"}'::jsonb
          ),
          (
            'repeat_times',
            'repetir',
            'controle',
            'Controle',
            290,
            0,
            '{"type":"repeat_times","message0":"repetir %1 vezes","args0":[{"type":"field_number","name":"TIMES","value":4,"min":1,"max":12}],"message1":"%1","args1":[{"type":"input_statement","name":"DO"}],"previousStatement":null,"nextStatement":null,"colour":290,"tooltip":"Repete os blocos de dentro várias vezes"}'::jsonb
          )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "blocks" WHERE "blockType" IN ('move_forward', 'turn', 'repeat_times')`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7a018348a866199f886fab6c84"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3811a639db7fc88ecfd2da9a43"`);
        await queryRunner.query(`DROP TABLE "blocks"`);
    }

}
