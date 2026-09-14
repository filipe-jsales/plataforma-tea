import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import type { MiniGameLevelDto } from '../../lib/miniGameLevelTypes';
import { TeacherMiniGameSettings } from './TeacherMiniGameSettings';

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPatch = vi.mocked(apiClient.patch);

const USE_LEVEL: MiniGameLevelDto = {
  id: 'l-use',
  conceptId: 'fractions_equal_parts',
  stage: 'use',
  position: 1,
  title: 'Observe o pedido pronto',
  prompt: 'Separe metade da barra.',
  config: { theme: 'chocolate_bar', targetFraction: { numerator: 1, denominator: 2 } },
  category: 'informatica_educacional',
};

const CREATE_LEVEL: MiniGameLevelDto = {
  id: 'l-create',
  conceptId: 'fractions_equal_parts',
  stage: 'create',
  position: 3,
  title: 'Monte o pedido do zero',
  prompt: 'Separe três quartos do jardim.',
  config: {
    theme: 'garden',
    targetFraction: { numerator: 3, denominator: 4 },
    fractionPool: [{ numerator: 3, denominator: 4 }],
  },
  category: 'informatica_educacional',
};

beforeEach(() => {
  mockedGet.mockReset().mockResolvedValue([USE_LEVEL, CREATE_LEVEL]);
  mockedPatch.mockReset();
});

describe('TeacherMiniGameSettings', () => {
  it('CC1 — shows the game category as read-only metadata', async () => {
    render(
      <MemoryRouter>
        <TeacherMiniGameSettings />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Informática Educacional')).toBeInTheDocument();
  });

  it('loads the levels and saves an edited target fraction for the Use level', async () => {
    mockedPatch.mockResolvedValue({ ...USE_LEVEL, config: { ...USE_LEVEL.config, targetFraction: { numerator: 1, denominator: 4 } } });
    render(
      <MemoryRouter>
        <TeacherMiniGameSettings />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Observe o pedido pronto')).toBeInTheDocument();

    const denominatorField = screen.getByLabelText('Denominador', { selector: '#denominator-l-use' });
    await userEvent.clear(denominatorField);
    await userEvent.type(denominatorField, '4');

    await userEvent.click(screen.getAllByRole('button', { name: 'Salvar' })[0]);

    expect(mockedPatch).toHaveBeenCalledWith('/teacher/minigames/levels/l-use', {
      theme: 'chocolate_bar',
      targetFraction: { numerator: 1, denominator: 4 },
    });
    expect(await screen.findByText('Configuração salva.')).toBeInTheDocument();
  });

  it('only includes fractionPool in the PATCH body for the Create level, never for Use/Modify', async () => {
    mockedPatch.mockResolvedValue(CREATE_LEVEL);
    render(
      <MemoryRouter>
        <TeacherMiniGameSettings />
      </MemoryRouter>,
    );

    await screen.findByText('Monte o pedido do zero');
    const saveButtons = screen.getAllByRole('button', { name: 'Salvar' });
    await userEvent.click(saveButtons[saveButtons.length - 1]);

    expect(mockedPatch).toHaveBeenCalledWith(
      '/teacher/minigames/levels/l-create',
      expect.objectContaining({ fractionPool: [{ numerator: 3, denominator: 4 }] }),
    );
  });

  it('adds a fraction to the pool, capped at 5 options', async () => {
    render(
      <MemoryRouter>
        <TeacherMiniGameSettings />
      </MemoryRouter>,
    );

    await screen.findByText('Monte o pedido do zero');
    const addButton = screen.getByRole('button', { name: 'Adicionar fração' });

    for (let i = 0; i < 4; i += 1) {
      await userEvent.click(addButton);
    }

    expect(addButton).toBeDisabled();
  });
});
