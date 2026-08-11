import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSetWaterStateBlock1786447933928 implements MigrationInterface {
    name = 'CreateSetWaterStateBlock1786447933928'

    // 3.13/3.14 — bloco-ação usado dentro dos ramos ENTÃO/SENÃO do
    // `conditional_if` (3.12): "definir estado como X". Mesma categoria
    // `logica` do condicional — os dois só existem juntos (um SE sem ação
    // dentro não decide nada). Leaf block (sem input_statement), com
    // previousStatement/nextStatement pra encaixar dentro de DO_THEN/
    // DO_ELSE do condicional, mesmo padrão de qualquer bloco empilhável do
    // catálogo (ver `move_forward`/`turn`).
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          INSERT INTO "blocks" ("blockType", "label", "category", "categoryLabel", "colour", "position", "blocklyJson") VALUES
          (
            'set_water_state',
            'definir estado como',
            'logica',
            'Lógica',
            210,
            1,
            '{
              "type": "set_water_state",
              "message0": "definir estado como %1",
              "args0": [
                { "type": "field_dropdown", "name": "STATE", "options": [
                  ["❄️ sólido", "SOLID"],
                  ["💧 líquido", "LIQUID"],
                  ["☁️ gasoso", "GAS"]
                ] }
              ],
              "previousStatement": null,
              "nextStatement": null,
              "colour": 210,
              "tooltip": "Define o estado atual da água"
            }'::jsonb
          )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "blocks" WHERE "blockType" = 'set_water_state'`);
    }

}
