import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { TeacherChallengeEdit } from './TeacherChallengeEdit';

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

vi.mock('../../components/challenge/PixiTurtleWorld', () => ({
  PixiTurtleWorld: () => <div data-testid="pixi-turtle-world-stub" />,
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedPatch = vi.mocked(apiClient.patch);

const templateDetail = {
  id: 'template-1',
  key: 'regular_polygon',
  name: 'Desenhar um polígono regular',
  description: 'descrição',
  icon: '🔷',
  parameterSchema: [
    { key: 'sides', label: 'Número de lados', icon: '🔺', type: 'integer', min: 3, max: 12, defaultValue: 4, visualPreview: 'polygonSides' },
  ],
};

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  mockedPatch.mockReset();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/teacher/challenges/c1/edit']}>
      <Routes>
        <Route path="/teacher/challenges/:challengeId/edit" element={<TeacherChallengeEdit />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TeacherChallengeEdit', () => {
  it('AC5/AC6 — opens in the same guided form, pre-filled with the saved parameters, never a raw editor', async () => {
    mockedGet.mockResolvedValueOnce({
      id: 'c1',
      title: 'Hexágonos',
      prompt: 'Monte um desenho com 6 lados.',
      templateId: 'template-1',
      templateKey: 'regular_polygon',
      params: { sides: 6 },
    });
    mockedGet.mockResolvedValueOnce(templateDetail);

    renderPage();

    expect(await screen.findByDisplayValue('Hexágonos')).toBeInTheDocument();
    expect(screen.getByLabelText('Número de lados')).toHaveValue(6);
  });

  it('shows a not-found message instead of a raw error for a challenge that is not the teacher\'s own', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Desafio não encontrado.'));

    renderPage();

    expect(await screen.findByText(/não existe mais ou não pertence a você/i)).toBeInTheDocument();
  });

  it('saves changes via PATCH scoped to this challenge id', async () => {
    mockedGet.mockResolvedValueOnce({
      id: 'c1',
      title: 'Hexágonos',
      prompt: 'Monte um desenho com 6 lados.',
      templateId: 'template-1',
      templateKey: 'regular_polygon',
      params: { sides: 6 },
    });
    mockedGet.mockResolvedValueOnce(templateDetail);
    mockedPost.mockResolvedValueOnce({
      valid: true,
      errors: [],
      goal: { shape: 'regular_polygon', sides: 8, turnAngleDeg: 45 },
    });
    mockedPatch.mockResolvedValueOnce({ id: 'c1' });

    renderPage();
    const input = await screen.findByLabelText('Número de lados');
    await userEvent.clear(input);
    await userEvent.type(input, '8');
    await userEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() =>
      expect(mockedPatch).toHaveBeenCalledWith('/teacher/challenges/c1', {
        title: 'Hexágonos',
        params: { sides: 8 },
      }),
    );
  });
});
