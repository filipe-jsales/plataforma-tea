import { MigrationInterface, QueryRunner } from "typeorm";

// Insere o desafio da fase `modify` (3.4) entre os dois desafios seed
// existentes, fechando o ciclo completo Use→Modify→Create (RQ2, 21,74% dos
// estudos primários) pela primeira vez neste tópico — ver a nota de
// pesquisa em challenge-config.interface.ts. Empurra "Monte o quadrado —
// sua vez!" (`create`) de position 2 pra 3, e insere o novo desafio em
// position 2 — exatamente o mecanismo que `Challenge.position` existe pra
// viabilizar (nunca `createdAt`).
//
// O `program` é o mesmo do Desafio 1 (mesma árvore serializada), só que
// agora com o campo ANGLE explícito no bloco `turn` (ver migration
// AddAngleFieldToTurnBlock, que roda antes desta). `editableFields` destrava
// TIMES (repeat_times) e ANGLE (turn) — os dois valores que, juntos, decidem
// a forma final (TIMES lados, cada um virando ANGLE graus). Os limites
// (3-8 lados, 30-150°) são curados aqui (não há autoria de professor via UI
// nesta versão — mesma decisão já tomada pra toolbox, ver "Blocos por
// desafio" em docs/ai/modules/backend.md) e ficam por-desafio, não por-bloco
// (um `modify` futuro noutro tópico pode usar limites diferentes).
//
// `predictQuestion` é o motor PRIMM "Predict" (3.6): o frontend exige uma
// resposta antes de liberar "Executar", a cada rodada.
export class SeedModifyChallenge1786038575438 implements MigrationInterface {
    name = 'SeedModifyChallenge1786038575438'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          UPDATE "challenges"
          SET "position" = 3
          WHERE "title" = 'Monte o quadrado — sua vez!'
        `);

        await queryRunner.query(`
          INSERT INTO "challenges" ("topicId", "title", "prompt", "position", "config")
          SELECT
            "id",
            'Monte o quadrado — agora mude!',
            'Esse é o mesmo programa do desafio anterior — mas agora você pode mudar os números. Tente descobrir que outras formas dá para desenhar!',
            2,
            '{
              "stage": "modify",
              "allowedBlockTypes": ["move_forward", "turn", "repeat_times"],
              "goal": { "shape": "square", "sides": 4, "turnAngleDeg": 90 },
              "program": {
                "type": "repeat_times",
                "fields": { "TIMES": 4 },
                "inputs": {
                  "DO": {
                    "block": {
                      "type": "move_forward",
                      "next": {
                        "block": {
                          "type": "turn",
                          "fields": { "DIR": "RIGHT", "ANGLE": 90 }
                        }
                      }
                    }
                  }
                }
              },
              "predictQuestion": "Quantos lados você acha que a figura vai ter depois de executar?",
              "editableFields": [
                { "blockType": "repeat_times", "fieldName": "TIMES", "label": "Número de lados", "min": 3, "max": 8 },
                { "blockType": "turn", "fieldName": "ANGLE", "label": "Ângulo de giro (graus)", "min": 30, "max": 150 }
              ]
            }'::jsonb
          FROM "topics" WHERE "slug" = 'angulos_formas'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "challenges" WHERE "title" = 'Monte o quadrado — agora mude!'`);
        await queryRunner.query(`
          UPDATE "challenges"
          SET "position" = 2
          WHERE "title" = 'Monte o quadrado — sua vez!'
        `);
    }

}
