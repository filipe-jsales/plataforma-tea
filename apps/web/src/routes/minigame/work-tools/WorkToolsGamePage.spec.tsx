import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../lib/apiClient';
import { logEvent } from '../../../lib/logEvent';
import { useAuthStore } from '../../../stores/useAuthStore';
import { WorkToolsGamePage } from './WorkToolsGamePage';
import type { WorkToolsMiniGameLevelDto } from '../../../lib/workToolsLevelTypes';

vi.mock('../../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../../lib/logEvent', () => ({ logEvent: vi.fn() }));

const mockedGet = vi.mocked(apiClient.get);
const mockedLogEvent = vi.mocked(logEvent);

const studentUser = {
  id: 'student-1',
  pseudonymId: 'pseudo-1',
  role: 'student' as const,
  displayName: 'Aluno Um',
  avatar: null,
  soundEnabled: false,
  animationEnabled: false,
  sensoryOnboardingCompletedAt: '2026-01-01',
};

const scenarios = {
  threeDPrint: { id: 's-3d-print', label: 'Preciso imprimir um protótipo físico de uma peça', icon: '🏭' },
  projectMgmt: { id: 's-project-mgmt', label: 'Preciso organizar as tarefas de um projeto com o time', icon: '🗂️' },
  tractor: { id: 's-tractor', label: 'Preciso lavrar um grande terreno agrícola', icon: '🌾' },
  mindMap: { id: 's-mindmap', label: 'Preciso estruturar visualmente as ideias de um brainstorm', icon: '💡' },
};

const tools = {
  threeDPrinter: { id: 't-3d-printer', label: 'Impressora 3D', icon: '🖨️' },
  projectTool: { id: 't-project-tool', label: 'Ferramenta de gestão de projetos', icon: '📋' },
  tractor: { id: 't-tractor', label: 'Trator', icon: '🚜' },
  mindMapTool: { id: 't-mindmap-tool', label: 'Mapa mental digital', icon: '🧠' },
};

const statements = [
  {
    id: 'st-spreadsheet-charts',
    text: 'Uma planilha eletrônica pode gerar gráficos pra entender melhor um cenário.',
    isTrue: true,
    explanation: 'Isso mesmo - planilhas eletrônicas têm recursos prontos pra transformar números em gráficos.',
  },
  {
    id: 'st-tractor-print',
    text: 'Um trator é a ferramenta certa pra imprimir um documento.',
    isTrue: false,
    explanation: 'Trator é uma máquina agrícola - não tem relação com imprimir documentos.',
  },
];

const correctMatches = [
  { scenarioId: scenarios.threeDPrint.id, toolId: tools.threeDPrinter.id },
  { scenarioId: scenarios.projectMgmt.id, toolId: tools.projectTool.id },
  { scenarioId: scenarios.tractor.id, toolId: tools.tractor.id },
  { scenarioId: scenarios.mindMap.id, toolId: tools.mindMapTool.id },
];

const useModifyScenarios = [scenarios.threeDPrint, scenarios.projectMgmt, scenarios.tractor, scenarios.mindMap];
const useModifyTools = [tools.threeDPrinter, tools.projectTool, tools.tractor, tools.mindMapTool];

const LEVELS: WorkToolsMiniGameLevelDto[] = [
  {
    id: 'l-use',
    conceptId: 'digital_tools_workplace',
    stage: 'use',
    position: 1,
    title: 'Veja como resolver cada situação',
    prompt: 'Observe como cada situação já está ligada à ferramenta certa.',
    category: 'educacao_computacao',
    config: {
      scenarios: useModifyScenarios,
      tools: useModifyTools,
      correctMatches,
      statements,
      presetMatches: correctMatches,
      presetStatementAnswers: { 'st-spreadsheet-charts': true, 'st-tractor-print': false },
    },
  },
  {
    id: 'l-modify',
    conceptId: 'digital_tools_workplace',
    stage: 'modify',
    position: 2,
    title: 'Corrija o que não bate',
    prompt: 'Uma situação está ligada à ferramenta errada, e uma afirmação está marcada errado.',
    category: 'educacao_computacao',
    config: {
      scenarios: useModifyScenarios,
      tools: useModifyTools,
      correctMatches,
      statements,
      // Par errado de propósito: mapa mental ligado à ferramenta de gestão
      // de projetos. Afirmação errada de propósito: "trator imprime
      // documento" marcada como verdadeira.
      presetMatches: [
        { scenarioId: scenarios.threeDPrint.id, toolId: tools.threeDPrinter.id },
        { scenarioId: scenarios.projectMgmt.id, toolId: tools.projectTool.id },
        { scenarioId: scenarios.tractor.id, toolId: tools.tractor.id },
        { scenarioId: scenarios.mindMap.id, toolId: tools.projectTool.id },
      ],
      presetStatementAnswers: { 'st-spreadsheet-charts': true, 'st-tractor-print': true },
    },
  },
  {
    id: 'l-create',
    conceptId: 'digital_tools_workplace',
    stage: 'create',
    position: 3,
    title: 'Monte você mesmo',
    prompt: 'Ligue cada situação à ferramenta certa e responda as afirmações.',
    category: 'educacao_computacao',
    config: {
      scenarios: [scenarios.threeDPrint],
      tools: [tools.threeDPrinter, tools.tractor],
      correctMatches,
      statements,
      scenarioPool: useModifyScenarios,
    },
  },
];

beforeEach(() => {
  mockedGet.mockReset().mockResolvedValue(LEVELS);
  mockedLogEvent.mockReset();
  useAuthStore.setState({ token: 'token', user: studentUser });
});

function renderGame(stage: string) {
  return render(
    <MemoryRouter initialEntries={[`/minigame/work-tools/${stage}`]}>
      <Routes>
        <Route path="/minigame/work-tools/:stage" element={<WorkToolsGamePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function dismissBriefing() {
  await userEvent.click(await screen.findByRole('button', { name: 'Começar' }));
}

describe('WorkToolsGamePage - nível Use', () => {
  it('shows a briefing (MJ3), then a read-only round already solved, and completes via "Conferir"', async () => {
    renderGame('use');
    expect(await screen.findByText('Veja como resolver cada situação')).toBeInTheDocument();

    await dismissBriefing();

    // Read-only: nenhum cartão selecionável de ferramenta, nem "Desfazer".
    expect(screen.queryByRole('button', { name: /Desfazer/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Impressora 3D/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Conferir' }));

    expect(await screen.findByRole('link', { name: /Próximo nível/ })).toBeInTheDocument();
    // Nível Use não é Create - nunca mostra "Novo cenário".
    expect(screen.queryByRole('button', { name: 'Novo cenário' })).not.toBeInTheDocument();
  });
});

describe('WorkToolsGamePage - nível Modify', () => {
  it('gates the true/false section until every pair is correct, and gives non-punitive retry feedback for the wrong preset pair', async () => {
    renderGame('modify');
    await dismissBriefing();

    expect(
      screen.getByText('Responda as afirmações depois de ligar todas as situações corretamente.'),
    ).toBeInTheDocument();

    // O par errado (mapa mental -> ferramenta de gestão de projetos) mostra
    // feedback de retentativa (ícone 🔁), nunca "errado".
    const mindMapRow = screen.getByText(/estruturar visualmente as ideias/).closest('.work-tools-game-page__row')!;
    expect(mindMapRow.textContent).toMatch(/🔁/);
    expect(mindMapRow.textContent?.toLowerCase()).not.toMatch(/errado/);
  });

  it('unlocks statements after fixing the wrong pair, and completes after fixing the wrong statement', async () => {
    renderGame('modify');
    await dismissBriefing();

    // Desfaz o par errado do mapa mental e liga à ferramenta certa.
    const mindMapRow = screen.getByText(/estruturar visualmente as ideias/).closest('.work-tools-game-page__row')!;
    await userEvent.click(screen.getByRole('button', { name: /Desfazer par de Preciso estruturar/ }));
    await userEvent.click(screen.getByText(/estruturar visualmente as ideias/));
    await userEvent.click(screen.getByText('Mapa mental digital'));

    expect(mindMapRow.textContent).toMatch(/✅/);

    // Afirmações liberadas - a errada ("trator imprime documento" = true)
    // mostra retentativa.
    expect(await screen.findByText(/Um trator é a ferramenta certa/)).toBeInTheDocument();
    expect(
      screen.queryByText('Responda as afirmações depois de ligar todas as situações corretamente.'),
    ).not.toBeInTheDocument();

    // Corrige pra "Falso" - completa a rodada.
    const statementGroup = screen
      .getByText(/Um trator é a ferramenta certa/)
      .closest('.work-tools-game-page__statement') as HTMLElement;
    await userEvent.click(within(statementGroup).getByRole('radio', { name: 'Falso' }));

    expect(await screen.findByRole('link', { name: /Próximo nível/ })).toBeInTheDocument();
  });
});

describe('WorkToolsGamePage - nível Create', () => {
  it('starts with no pairs made, links a scenario to a tool by tap-select-then-tap-select (never drag-and-drop)', async () => {
    renderGame('create');
    await dismissBriefing();

    expect(
      screen.getByText('Responda as afirmações depois de ligar todas as situações corretamente.'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByText(/imprimir um protótipo físico/));
    await userEvent.click(screen.getByText('Impressora 3D'));

    const row = screen.getByText(/imprimir um protótipo físico/).closest('.work-tools-game-page__row')!;
    expect(row.textContent).toMatch(/✅/);
    expect(row.textContent).toMatch(/Impressora 3D/);
  });

  it('emits a work_tools_match_made (RD-P) event with correct:true for a right pair', async () => {
    renderGame('create');
    await dismissBriefing();

    await userEvent.click(screen.getByText(/imprimir um protótipo físico/));
    await userEvent.click(screen.getByText('Impressora 3D'));

    expect(mockedLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        studentPseudoId: 'pseudo-1',
        miniGameLevelId: 'l-create',
        category: 'RD-P',
        type: 'work_tools_match_made',
        payload: expect.objectContaining({
          scenario_id: 's-3d-print',
          tool_id: 't-3d-printer',
          correct: true,
        }),
      }),
    );
  });
});

describe('WorkToolsGamePage - falha ao carregar os níveis', () => {
  it('shows a retry-friendly message instead of "Carregando…" forever when the levels request fails', async () => {
    mockedGet.mockReset().mockRejectedValue(new Error('Erro 500'));

    renderGame('use');

    expect(await screen.findByText('Erro 500')).toBeInTheDocument();
    expect(screen.queryByText('Carregando…')).not.toBeInTheDocument();
  });
});
