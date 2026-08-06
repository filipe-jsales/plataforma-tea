import { MigrationInterface, QueryRunner } from "typeorm";

// Converte o desafio seed único ("Monte o quadrado") em "Desafio 1" da
// sequência Use-Modify-Create (fase `use`, 3.3): programa pré-montado e
// travado, só Executar/Repetir execução, com pergunta de investigação
// depois de rodar. Adiciona "Desafio 2" (fase `create`, 3.5): o mesmo
// objetivo (quadrado), mas o aluno monta do zero no editor livre — reusa a
// paleta 3.1 já existente, com botão de Ajuda mostrando a forma sem
// entregar os blocos.
//
// Estado INTERMEDIÁRIO de propósito — falta o "Desafio 3" (fase `modify`,
// 3.4) entre os dois pra fechar o ciclo completo Use→Modify→Create com
// respaldo empírico (RQ2, 21,74% dos estudos). Ver a nota de pesquisa
// completa em src/challenges/challenge-config.interface.ts — não tratar
// esta sequência de 2 desafios como validada/completa.
export class SeedUseModifyCreateSequence1786032637460 implements MigrationInterface {
    name = 'SeedUseModifyCreateSequence1786032637460'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          UPDATE "challenges"
          SET
            "position" = 1,
            "config" = '{
              "stage": "use",
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
                          "fields": { "DIR": "RIGHT" }
                        }
                      }
                    }
                  }
                }
              },
              "investigationQuestion": "Quantas vezes o personagem virou?"
            }'::jsonb
          WHERE "title" = 'Monte o quadrado'
        `);

        await queryRunner.query(`
          INSERT INTO "challenges" ("topicId", "title", "prompt", "position", "config")
          SELECT
            "id",
            'Monte o quadrado — sua vez!',
            'Agora é com você: encaixe os blocos para desenhar um quadrado na tela.',
            2,
            '{
              "stage": "create",
              "allowedBlockTypes": ["move_forward", "turn", "repeat_times"],
              "goal": { "shape": "square", "sides": 4, "turnAngleDeg": 90 }
            }'::jsonb
          FROM "topics" WHERE "slug" = 'angulos_formas'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "challenges" WHERE "title" = 'Monte o quadrado — sua vez!'`);
        await queryRunner.query(`
          UPDATE "challenges"
          SET "config" = '{
            "stage": "use",
            "allowedBlockTypes": ["move_forward", "turn", "repeat_times"],
            "goal": { "shape": "square", "sides": 4, "turnAngleDeg": 90 }
          }'::jsonb
          WHERE "title" = 'Monte o quadrado'
        `);
    }

}
