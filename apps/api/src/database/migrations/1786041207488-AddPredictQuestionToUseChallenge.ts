import { MigrationInterface, QueryRunner } from "typeorm";

// Fecha a lacuna sinalizada na rastreabilidade PRIMM (ver
// "Rastreabilidade PRIMM × Use-Modify-Create" em docs/ai/modules/backend.md):
// decisão de produto foi adicionar Predict também no desafio `use` (3.3),
// além de mantê-lo no `modify` (3.4) — P-R-I ficam unificados em 3.3 (mais
// próximo da formulação clássica de PRIMM), enquanto 3.4 mantém sua própria
// previsão repetida a cada rodada de edição (os valores mudam a cada vez,
// diferente de 3.3 onde o programa nunca muda).
//
// O mecanismo do frontend já era genérico (`challenge.predictQuestion`
// presente → mostra o widget de previsão antes do botão Executar, ver
// ChallengePage.tsx) — não precisou de nenhuma tela nova, só este campo de
// config. Diferente de 3.4, aqui a previsão só é pedida antes da 1ª
// execução (o programa é fixo, então re-executar não muda o que há pra
// prever) — o frontend só reresseta a pergunta pra 'predict' de novo
// dentro do fluxo específico de `modify`.
export class AddPredictQuestionToUseChallenge1786041207488 implements MigrationInterface {
    name = 'AddPredictQuestionToUseChallenge1786041207488'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          UPDATE "challenges"
          SET "config" = jsonb_set(
            "config",
            '{predictQuestion}',
            '"Antes de executar: quantos lados você acha que essa figura vai ter?"'
          )
          WHERE "title" = 'Monte o quadrado'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
          UPDATE "challenges"
          SET "config" = "config" - 'predictQuestion'
          WHERE "title" = 'Monte o quadrado'
        `);
    }

}
