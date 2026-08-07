import { MigrationInterface, QueryRunner } from "typeorm";

// Paridade de dado entre o desafio `use` (3.3) e o desafio `modify` (3.4):
// o PRIMM pressupõe que o aluno modifica o MESMO programa que acabou de
// investigar, não uma cópia divergente. Os dois já eram estruturalmente
// idênticos (repeat_times{TIMES:4} → move_forward → turn{DIR:RIGHT}), mas
// o `program` do desafio `use` foi seedado (migration
// SeedUseModifyCreateSequence) antes do campo ANGLE existir no bloco `turn`
// (migration AddAngleFieldToTurnBlock) — então seu `turn.fields` não tem a
// chave `ANGLE` explícita, só herda o valor default (90) do bloco em tempo
// de carga no Blockly. Efeito visual/funcional já era idêntico, mas não
// byte-a-byte — esta migration fecha essa lacuna, tornando os dois
// `program` explicitamente iguais (verificável por comparação direta do
// jsonb, não só "funciona igual na prática").
export class AlignUseProgramAngleField1786040305229 implements MigrationInterface {
    name = 'AlignUseProgramAngleField1786040305229'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          UPDATE "challenges"
          SET "config" = jsonb_set(
            "config",
            '{program,inputs,DO,block,next,block,fields,ANGLE}',
            '90'
          )
          WHERE "title" = 'Monte o quadrado'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          UPDATE "challenges"
          SET "config" = "config" #- '{program,inputs,DO,block,next,block,fields,ANGLE}'
          WHERE "title" = 'Monte o quadrado'
        `);
    }

}
