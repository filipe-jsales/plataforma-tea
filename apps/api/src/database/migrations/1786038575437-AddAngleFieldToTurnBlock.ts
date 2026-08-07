import { MigrationInterface, QueryRunner } from "typeorm";

// O bloco "turn" só tinha o dropdown DIR (esquerda/direita) — o ângulo de
// giro era um valor fixo (90°) dentro de apps/web/src/lib/turtleWorld.ts,
// nunca um campo do bloco. O desafio "modify" (3.4, ver migration
// SeedModifyChallenge logo depois desta) precisa que o aluno consiga mudar
// o ângulo pra virar o quadrado em triângulo/pentágono/etc., então o ângulo
// precisa existir como campo do bloco. min/max aqui é o limite técnico do
// próprio bloco (não deixar ângulo negativo ou >= 360°, AC de 3.4) — o
// desafio "modify" aplica um limite mais estreito por cima disso via
// Challenge.config.editableFields (ver challenge-config.interface.ts).
//
// Efeito em desafios existentes: o bloco "turn" passa a mostrar o valor do
// ângulo em toda tela que o usa — na fase `use` (travada) é só texto a mais
// pro aluno observar; na fase `create` (livre) o aluno passa a definir o
// ângulo explicitamente (antes o giro só podia mesmo ser de 90°, um valor
// implícito do executor) — correto pro tópico geometria, não uma regressão.
export class AddAngleFieldToTurnBlock1786038575437 implements MigrationInterface {
    name = 'AddAngleFieldToTurnBlock1786038575437'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          UPDATE "blocks"
          SET "blocklyJson" = '{
            "type": "turn",
            "message0": "girar %1 %2 graus",
            "args0": [
              { "type": "field_dropdown", "name": "DIR", "options": [["para a direita", "RIGHT"], ["para a esquerda", "LEFT"]] },
              { "type": "field_number", "name": "ANGLE", "value": 90, "min": 1, "max": 359 }
            ],
            "previousStatement": null,
            "nextStatement": null,
            "colour": 200,
            "tooltip": "Gira o personagem o número de graus indicado"
          }'::jsonb
          WHERE "blockType" = 'turn'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          UPDATE "blocks"
          SET "blocklyJson" = '{
            "type": "turn",
            "message0": "girar %1",
            "args0": [
              { "type": "field_dropdown", "name": "DIR", "options": [["para a direita", "RIGHT"], ["para a esquerda", "LEFT"]] }
            ],
            "previousStatement": null,
            "nextStatement": null,
            "colour": 200,
            "tooltip": "Gira o personagem 90 graus"
          }'::jsonb
          WHERE "blockType" = 'turn'
        `);
    }

}
