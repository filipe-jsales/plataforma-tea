import { MigrationInterface, QueryRunner } from 'typeorm';

// MJ10 — 2º mini jogo de CONTEÚDO da plataforma ("Ferramentas do Mundo do
// Trabalho", BNCC EM13CO09), ver
// docs/ai/backlog/mini-jogo-ferramentas-mundo-trabalho.md. Mesmo padrão de
// `CreateMiniGameLevels` (frações): 3 linhas = os 3 níveis
// Use→Modify→Create. Diferente de frações, `gameKey`/`category` já existem
// como colunas (MJ9/CC1) — gravados explicitamente aqui, nunca deixados
// cair em default (a coluna `gameKey` nem tem default, de propósito).
//
// `category: 'educacao_computacao'` — este jogo ensina sobre tecnologia em
// si (identificar a ferramenta digital certa pra um problema do mundo do
// trabalho), não uma disciplina da educação básica, diferente dos dois
// tópicos de blocos e do jogo de frações (todos `informatica_educacional`).
//
// Nada aqui é gabarito oculto (mesmo racional de frações) — `correctMatches`
// e `isTrue` são exatamente o que a validação no cliente compara contra.
export class CreateWorkToolsMiniGame1787800000000
  implements MigrationInterface
{
  name = 'CreateWorkToolsMiniGame1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const scenarios = {
      threeDPrint: { id: 's-3d-print', label: 'Preciso imprimir um protótipo físico de uma peça', icon: '🏭' },
      projectMgmt: { id: 's-project-mgmt', label: 'Preciso organizar as tarefas de um projeto com o time', icon: '🗂️' },
      tractor: { id: 's-tractor', label: 'Preciso lavrar um grande terreno agrícola', icon: '🌾' },
      mindMap: { id: 's-mindmap', label: 'Preciso estruturar visualmente as ideias de um brainstorm', icon: '💡' },
      spreadsheet: { id: 's-spreadsheet', label: 'Preciso calcular e visualizar os gastos do mês em gráficos', icon: '💰' },
    };

    const tools = {
      threeDPrinter: { id: 't-3d-printer', label: 'Impressora 3D', icon: '🖨️' },
      projectTool: { id: 't-project-tool', label: 'Ferramenta de gestão de projetos', icon: '📋' },
      tractor: { id: 't-tractor', label: 'Trator', icon: '🚜' },
      mindMapTool: { id: 't-mindmap-tool', label: 'Mapa mental digital', icon: '🧠' },
      spreadsheetTool: { id: 't-spreadsheet', label: 'Planilha eletrônica', icon: '📊' },
      graphicEditor: { id: 't-graphic-editor', label: 'Editor gráfico', icon: '🖼️' },
    };

    const statements = [
      {
        id: 'st-spreadsheet-charts',
        text: 'Uma planilha eletrônica pode gerar gráficos pra entender melhor um cenário.',
        isTrue: true,
        explanation: 'Isso mesmo — planilhas eletrônicas têm recursos prontos pra transformar números em gráficos.',
      },
      {
        id: 'st-tractor-print',
        text: 'Um trator é a ferramenta certa pra imprimir um documento.',
        isTrue: false,
        explanation: 'Trator é uma máquina agrícola — não tem relação com imprimir documentos.',
      },
      {
        id: 'st-3d-print-prototype',
        text: 'Uma impressora 3D é útil pra testar o formato de uma peça antes de fabricar em grande escala.',
        isTrue: true,
        explanation: 'Exatamente — impressoras 3D são ótimas pra prototipagem antes da produção em massa.',
      },
    ];

    // Gabarito completo — cobre TODO cenário usado em qualquer nível
    // (inclusive os do `scenarioPool` do Create), nunca só os 4 do
    // Use/Modify.
    const correctMatches = [
      { scenarioId: scenarios.threeDPrint.id, toolId: tools.threeDPrinter.id },
      { scenarioId: scenarios.projectMgmt.id, toolId: tools.projectTool.id },
      { scenarioId: scenarios.tractor.id, toolId: tools.tractor.id },
      { scenarioId: scenarios.mindMap.id, toolId: tools.mindMapTool.id },
      { scenarioId: scenarios.spreadsheet.id, toolId: tools.spreadsheetTool.id },
    ];

    const useModifyScenarios = [scenarios.threeDPrint, scenarios.projectMgmt, scenarios.tractor, scenarios.mindMap];
    const useModifyTools = [tools.threeDPrinter, tools.projectTool, tools.tractor, tools.mindMapTool];

    const useConfig = JSON.stringify({
      scenarios: useModifyScenarios,
      tools: useModifyTools,
      correctMatches,
      statements,
      presetMatches: [
        { scenarioId: scenarios.threeDPrint.id, toolId: tools.threeDPrinter.id },
        { scenarioId: scenarios.projectMgmt.id, toolId: tools.projectTool.id },
        { scenarioId: scenarios.tractor.id, toolId: tools.tractor.id },
        { scenarioId: scenarios.mindMap.id, toolId: tools.mindMapTool.id },
      ],
      presetStatementAnswers: {
        'st-spreadsheet-charts': true,
        'st-tractor-print': false,
        'st-3d-print-prototype': true,
      },
    }).replace(/'/g, "''");

    // Nível Modify: 1 par errado de propósito (mundo do trabalho pede
    // impressão de brainstorm — trocado por engano com "gestão de
    // projetos") + 1 afirmação marcada errada de propósito — mesmo racional
    // do "cartão errado" do Modify de frações.
    const modifyConfig = JSON.stringify({
      scenarios: useModifyScenarios,
      tools: useModifyTools,
      correctMatches,
      statements,
      presetMatches: [
        { scenarioId: scenarios.threeDPrint.id, toolId: tools.threeDPrinter.id },
        { scenarioId: scenarios.projectMgmt.id, toolId: tools.projectTool.id },
        { scenarioId: scenarios.tractor.id, toolId: tools.tractor.id },
        { scenarioId: scenarios.mindMap.id, toolId: tools.projectTool.id },
      ],
      presetStatementAnswers: {
        'st-spreadsheet-charts': true,
        'st-tractor-print': true,
        'st-3d-print-prototype': true,
      },
    }).replace(/'/g, "''");

    const createConfig = JSON.stringify({
      scenarios: [scenarios.threeDPrint, scenarios.projectMgmt, scenarios.tractor],
      tools: [
        tools.threeDPrinter,
        tools.projectTool,
        tools.tractor,
        tools.mindMapTool,
        tools.spreadsheetTool,
        tools.graphicEditor,
      ],
      correctMatches,
      statements,
      scenarioPool: [
        scenarios.threeDPrint,
        scenarios.projectMgmt,
        scenarios.tractor,
        scenarios.mindMap,
        scenarios.spreadsheet,
      ],
    }).replace(/'/g, "''");

    await queryRunner.query(`
      INSERT INTO "mini_game_levels" ("id", "conceptId", "stage", "position", "title", "prompt", "config", "gameKey", "category") VALUES
      (uuid_generate_v4(), 'digital_tools_workplace', 'use', 1, 'Veja como resolver cada situação', 'Observe como cada situação do mundo do trabalho já está ligada à ferramenta certa, e veja se as afirmações abaixo fazem sentido.', '${useConfig}', 'work_tools_match', 'educacao_computacao'),
      (uuid_generate_v4(), 'digital_tools_workplace', 'modify', 2, 'Corrija o que não bate', 'Uma situação está ligada à ferramenta errada, e uma afirmação está marcada errado. Encontre e corrija.', '${modifyConfig}', 'work_tools_match', 'educacao_computacao'),
      (uuid_generate_v4(), 'digital_tools_workplace', 'create', 3, 'Monte você mesmo', 'Ligue cada situação à ferramenta certa e responda se as afirmações são verdadeiras ou falsas.', '${createConfig}', 'work_tools_match', 'educacao_computacao')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "mini_game_levels" WHERE "conceptId" = 'digital_tools_workplace'`,
    );
  }
}
