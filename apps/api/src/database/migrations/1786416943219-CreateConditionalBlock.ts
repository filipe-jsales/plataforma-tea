import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateConditionalBlock1786416943219 implements MigrationInterface {
    name = 'CreateConditionalBlock1786416943219'

    // 3.12 — bloco condicional (SE/ENTÃO/SENÃO), infraestrutura de UI pura:
    // nenhuma tabela/coluna nova, só uma linha no catálogo `blocks` (mesmo
    // padrão de CreateBlocks/AddAngleFieldToTurnBlock — `migration:generate`
    // não geraria diff pra isto, é dado, não schema).
    //
    // "Paleta configurável por fase" (título do card) já é um mecanismo
    // GENÉRICO existente desde o motor Use-Modify-Create original — nenhuma
    // fase lê `blockType` pra decidir comportamento: `use` nunca mostra
    // toolbox (workspace pré-montado a partir de `Challenge.config.program`,
    // travado via `readOnly`), `create` mostra a toolbox inteira resolvida a
    // partir de `Challenge.config.allowedBlockTypes` (ver
    // ChallengesController.buildDetailOrThrow), e `modify` também não
    // mostra toolbox — só destrava campos específicos do `program`
    // pré-montado via `Challenge.config.editableFields`/
    // `applyModifyFieldLocking` (ChallengePage.tsx), o mesmo mecanismo que já
    // vale pra TIMES/ANGLE do bloco `repeat_times`/`turn`. Por isso este
    // card não precisa de nenhuma lógica nova de tela: o campo THRESHOLD
    // abaixo é só mais um `field_number`, destravável por-desafio do mesmo
    // jeito que ANGLE — nunca uma toolbox própria de "blocos numéricos" pra
    // fase modify (decisão deliberada: evitar 2 mecanismos de edição de
    // valor coexistindo na plataforma). O que ESTE card cadastra pela
    // primeira vez é um bloco com DOIS `input_statement` nomeados (ENTÃO/
    // SENÃO) — `repeat_times` já provou o encaixe de um `input_statement`
    // (DO); a interpretação/execução real da condição (qual "valor" ela
    // compara) é responsabilidade de cada desafio que a introduzir (3.13+,
    // fora do escopo deste card — "Dados gerados: nenhum evento próprio").
    //
    // Categoria nova (`logica`/Lógica), separada de `movimento`/`controle`:
    // regra não-negociável 2 (uma paleta de blocos nova por tela) — lógica
    // condicional é um salto conceitual (RQ4, 39,13% dos estudos primários),
    // não uma variação de "mover"/"repetir".
    //
    // AC4 do card — "cada ramo deve exibir ícone + texto, nunca só cor":
    // `message1`/`message2` embutem o emoji (✅/❌) DENTRO do rótulo do
    // ramo, mesmo "sistema de ícone" (emoji, nunca lib de ícone) usado em
    // `ChallengeTemplate.icon`/`Illustration` — nunca dependência só da cor
    // do bloco (`colour`) pra diferenciar ENTÃO de SENÃO.
    //
    // THRESHOLD sem min/max estreito aqui (só um piso/teto técnico bem
    // largo, -999/999) — mesmo racional de ANGLE em AddAngleFieldToTurnBlock:
    // o limite pedagógico por-desafio é decidido depois, via
    // `EditableFieldConfig.min/max`, nunca hardcoded no bloco. `value: 100`
    // como default antecipa o primeiro uso concreto (3.13 — limiar de
    // ebulição da água, 100°C), sem acoplar o bloco a essa unidade
    // especificamente (o rótulo diz "a medida", nunca "a temperatura").
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          INSERT INTO "blocks" ("blockType", "label", "category", "categoryLabel", "colour", "position", "blocklyJson") VALUES
          (
            'conditional_if',
            'se / então / senão',
            'logica',
            'Lógica',
            210,
            0,
            '{
              "type": "conditional_if",
              "message0": "SE a medida for maior que %1",
              "args0": [
                { "type": "field_number", "name": "THRESHOLD", "value": 100, "min": -999, "max": 999 }
              ],
              "message1": "✅ ENTÃO %1",
              "args1": [
                { "type": "input_statement", "name": "DO_THEN" }
              ],
              "message2": "❌ SENÃO %1",
              "args2": [
                { "type": "input_statement", "name": "DO_ELSE" }
              ],
              "previousStatement": null,
              "nextStatement": null,
              "colour": 210,
              "tooltip": "Faz uma coisa se a medida passar do valor indicado, ou outra coisa se não passar"
            }'::jsonb
          )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "blocks" WHERE "blockType" = 'conditional_if'`);
    }

}
