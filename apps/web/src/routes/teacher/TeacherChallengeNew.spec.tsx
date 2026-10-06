import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { CHALLENGE_FORM_TOUR_KEY } from '../../lib/teacherChallengeFormTour';
import { useGuidedTourStore } from '../../stores/useGuidedTourStore';
import { TeacherChallengeNew } from './TeacherChallengeNew';

vi.mock('../../lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../../lib/apiClient')>('../../lib/apiClient');
  return { ApiError: actual.ApiError, apiClient: { get: vi.fn(), post: vi.fn() } };
});

vi.mock('../../components/challenge/PixiTurtleWorld', () => ({
  PixiTurtleWorld: () => <div data-testid="pixi-turtle-world-stub" />,
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

const templateSummary = {
  id: 'template-1',
  key: 'regular_polygon',
  name: 'Desenhar um polígono regular',
  description: 'O aluno monta um desenho com o número de lados escolhido por você.',
  icon: '🔷',
  category: 'informatica_educacional' as const,
};

const templateDetail = {
  ...templateSummary,
  parameterSchema: [
    { key: 'sides', label: 'Número de lados', icon: '🔺', type: 'integer', min: 3, max: 12, defaultValue: 4, visualPreview: 'polygonSides' },
  ],
  primmQuestionSuggestion: {
    predictQuestion: 'Quantos lados você acha que essa figura vai ter?',
    investigationQuestion: 'O que você percebeu sobre o ângulo de giro?',
  },
};

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  // Tour já visto por padrão - sem isso, o GuidedTour abriria sozinho em
  // TODO teste que chega no formulário (Radix Dialog é modal: esconde o
  // resto da árvore via aria-hidden enquanto aberto, o que quebraria
  // `getByRole`/`getByLabelText` nos campos do formulário por baixo). Os
  // testes que exercitam o tour em si (abaixo) resetam pra `{}` de
  // propósito.
  useGuidedTourStore.setState({ seenTours: { [CHALLENGE_FORM_TOUR_KEY]: true } });
});

function renderPage(initialEntry = '/teacher/challenges/new') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/teacher/challenges/new" element={<TeacherChallengeNew />} />
        <Route path="/teacher/challenges" element={<div>Meus desafios</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TeacherChallengeNew', () => {
  it('AC1 - the gallery shows the pedagogical name/description/icon, never the technical template key', async () => {
    mockedGet.mockResolvedValueOnce([templateSummary]);

    renderPage();

    expect(await screen.findByText('Desenhar um polígono regular')).toBeInTheDocument();
    expect(screen.getByText('O aluno monta um desenho com o número de lados escolhido por você.')).toBeInTheDocument();
    expect(screen.queryByText('regular_polygon')).not.toBeInTheDocument();
  });

  it('CC1 - the gallery shows the template category as read-only metadata', async () => {
    mockedGet.mockResolvedValueOnce([templateSummary]);

    renderPage();

    expect(await screen.findByText(/Informática Educacional/i)).toBeInTheDocument();
  });

  it('CC1 - the selected template form also shows the category as a read-only badge', async () => {
    mockedGet.mockResolvedValueOnce([templateSummary]);
    mockedGet.mockResolvedValueOnce(templateDetail);

    renderPage();
    await userEvent.click(await screen.findByText('Desenhar um polígono regular'));

    expect(await screen.findByText('Informática Educacional')).toBeInTheDocument();
  });

  it('AC2 - selecting a template opens its guided parameter form', async () => {
    mockedGet.mockResolvedValueOnce([templateSummary]);
    mockedGet.mockResolvedValueOnce(templateDetail);

    renderPage();
    await userEvent.click(await screen.findByText('Desenhar um polígono regular'));

    expect(await screen.findByLabelText('Número de lados')).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith('/challenge-templates/template-1');
  });

  it('AC6 - duplicating pre-selects the same template and pre-fills the same parameters, title suffixed "(cópia)"', async () => {
    mockedGet.mockResolvedValueOnce([templateSummary]);
    mockedGet.mockResolvedValueOnce({
      id: 'c1',
      title: 'Hexágonos',
      prompt: 'Monte um desenho com 6 lados.',
      templateId: 'template-1',
      templateKey: 'regular_polygon',
      params: { sides: 6 },
    });
    mockedGet.mockResolvedValueOnce(templateDetail);

    renderPage('/teacher/challenges/new?fromChallengeId=c1');

    expect(await screen.findByDisplayValue('Hexágonos (cópia)')).toBeInTheDocument();
    expect(screen.getByLabelText('Número de lados')).toHaveValue(6);
  });

  it('creates the challenge against the selected template and never sends raw block structure', async () => {
    mockedGet.mockResolvedValueOnce([templateSummary]);
    mockedGet.mockResolvedValueOnce(templateDetail);
    mockedPost.mockResolvedValueOnce({ valid: true, errors: [], goal: { shape: 'regular_polygon', sides: 4, turnAngleDeg: 90 } });
    mockedPost.mockResolvedValueOnce({ id: 'new-challenge' });

    renderPage();
    await userEvent.click(await screen.findByText('Desenhar um polígono regular'));
    await userEvent.type(await screen.findByPlaceholderText(/triângulos/i), 'Meu desafio');
    await userEvent.click(screen.getByRole('button', { name: /^salvar desafio$/i }));

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith('/challenge-templates/template-1/challenges', {
        title: 'Meu desafio',
        params: { sides: 4 },
        feedbackMessages: { retry: '', success: '' },
        predictQuestion: templateDetail.primmQuestionSuggestion.predictQuestion,
        investigationQuestion: templateDetail.primmQuestionSuggestion.investigationQuestion,
      }),
    );
  });

  describe('survey de pesquisa após criar o desafio', () => {
    async function createChallenge() {
      mockedGet.mockResolvedValueOnce([templateSummary]);
      mockedGet.mockResolvedValueOnce(templateDetail);
      mockedPost.mockResolvedValueOnce({ valid: true, errors: [], goal: { shape: 'regular_polygon', sides: 4, turnAngleDeg: 90 } });
      mockedPost.mockResolvedValueOnce({ id: 'new-challenge' });

      renderPage();
      await userEvent.click(await screen.findByText('Desenhar um polígono regular'));
      await userEvent.type(await screen.findByPlaceholderText(/triângulos/i), 'Meu desafio');
      await userEvent.click(screen.getByRole('button', { name: /^salvar desafio$/i }));
    }

    it('shows the survey instead of navigating away right after a successful creation', async () => {
      await createChallenge();

      expect(await screen.findByText(/uma pergunta rápida/i)).toBeInTheDocument();
      expect(screen.queryByText('Meus desafios')).not.toBeInTheDocument();
    });

    it('navigates to "Meus desafios" only after the survey is answered, scoped to the challenge just created', async () => {
      await createChallenge();
      await screen.findByText(/uma pergunta rápida/i);
      mockedPost.mockResolvedValueOnce(undefined);

      await userEvent.click(screen.getByRole('button', { name: /enviar respostas/i }));

      expect(await screen.findByText('Meus desafios')).toBeInTheDocument();
      expect(mockedPost).toHaveBeenCalledWith('/surveys/challenge-creation', {
        challengeId: 'new-challenge',
        status: 'submitted',
        quantitative: {},
        qualitative: {},
      });
    });

    it('navigates to "Meus desafios" when the professor declines the survey', async () => {
      await createChallenge();
      await screen.findByText(/uma pergunta rápida/i);
      mockedPost.mockResolvedValueOnce(undefined);

      await userEvent.click(screen.getByRole('button', { name: /agora não/i }));

      expect(await screen.findByText('Meus desafios')).toBeInTheDocument();
      expect(mockedPost).toHaveBeenCalledWith('/surveys/challenge-creation', {
        challengeId: 'new-challenge',
        status: 'declined',
      });
    });
  });

  describe('tutorial guiado do formulário', () => {
    it('opens by itself the first time the professor reaches the guided form', async () => {
      useGuidedTourStore.setState({ seenTours: {} });
      mockedGet.mockResolvedValueOnce([templateSummary]);
      mockedGet.mockResolvedValueOnce(templateDetail);

      renderPage();
      await userEvent.click(await screen.findByText('Desenhar um polígono regular'));

      expect(await screen.findByRole('dialog')).toHaveTextContent('Dê um nome pro desafio');
    });

    it('does not reopen on its own after the professor closes it once (marks the tour as seen)', async () => {
      useGuidedTourStore.setState({ seenTours: {} });
      mockedGet.mockResolvedValueOnce([templateSummary]);
      mockedGet.mockResolvedValueOnce(templateDetail);

      renderPage();
      await userEvent.click(await screen.findByText('Desenhar um polígono regular'));
      await userEvent.click(await screen.findByRole('button', { name: /pular tutorial/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(useGuidedTourStore.getState().hasSeenTour(CHALLENGE_FORM_TOUR_KEY)).toBe(true);
    });

    it('"❔ Rever tutorial" always reopens it manually, even after it was already seen', async () => {
      mockedGet.mockResolvedValueOnce([templateSummary]);
      mockedGet.mockResolvedValueOnce(templateDetail);

      renderPage();
      await userEvent.click(await screen.findByText('Desenhar um polígono regular'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /rever tutorial/i }));

      expect(await screen.findByRole('dialog')).toHaveTextContent('Dê um nome pro desafio');
    });
  });
});
