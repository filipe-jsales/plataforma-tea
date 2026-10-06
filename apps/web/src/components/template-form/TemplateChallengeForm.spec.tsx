import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiError } from '../../lib/apiClient';
import type { ChallengeTemplateDetail } from '../../lib/challengeTemplateTypes';
import { TemplateChallengeForm } from './TemplateChallengeForm';

vi.mock('../../lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('../../lib/apiClient')>('../../lib/apiClient');
  return { ApiError: actual.ApiError, apiClient: { post: vi.fn() } };
});

// Pixi.js não roda de verdade em jsdom (sem WebGL/Canvas real) - o mesmo
// racional de qualquer teste que isola PixiTurtleWorld (ver nota de débito
// "ChallengePage sem RTL ainda" em docs/ai/modules/frontend.md). O que
// importa testar aqui é SE o painel de preview aparece, não como o Pixi
// desenha por dentro.
vi.mock('../challenge/PixiTurtleWorld', () => ({
  PixiTurtleWorld: () => <div data-testid="pixi-turtle-world-stub" />,
}));

const mockedPost = vi.mocked(apiClient.post);

const template: ChallengeTemplateDetail = {
  id: 'template-1',
  key: 'regular_polygon',
  category: 'informatica_educacional',
  name: 'Desenhar um polígono regular',
  description: 'descrição',
  icon: '🔷',
  parameterSchema: [
    { key: 'sides', label: 'Número de lados', icon: '🔺', type: 'integer', min: 3, max: 12, defaultValue: 4, visualPreview: 'polygonSides' },
    { key: 'turnAngleDeg', label: 'Ângulo de giro', icon: '📐', type: 'integer', min: 1, max: 359, defaultValue: 90, visualPreview: 'angleWedge' },
    { key: 'snapTolerancePercent', label: 'Tolerância de encaixe', icon: '🧲', type: 'percentage', min: 10, max: 100, defaultValue: 60, visualPreview: 'toleranceGauge' },
    {
      key: 'enabledBlockTypes',
      label: 'Blocos disponíveis',
      icon: '🧩',
      type: 'blockSelection',
      defaultValue: ['move_forward', 'turn'],
      visualPreview: 'none',
      options: [
        { value: 'move_forward', label: 'Mover para frente' },
        { value: 'turn', label: 'Girar' },
      ],
    },
  ],
  primmQuestionSuggestion: {
    predictQuestion: 'Quantos lados você acha que essa figura vai ter?',
    investigationQuestion: 'O que você percebeu sobre o ângulo de giro?',
  },
};

beforeEach(() => {
  mockedPost.mockReset();
});

describe('TemplateChallengeForm', () => {
  it('seeds every field from the template defaults when no initial params are given', () => {
    render(<TemplateChallengeForm template={template} submitLabel="Salvar desafio" onSubmit={vi.fn()} />);

    expect(screen.getByLabelText('Número de lados')).toHaveValue(4);
    expect(screen.getByLabelText('Ângulo de giro')).toHaveValue(90);
  });

  it('AC5/AC6 - prefills title and params for edit/duplicate, the same form as creation', () => {
    render(
      <TemplateChallengeForm
        template={template}
        initialTitle="Hexágonos"
        initialParams={{ sides: 6, turnAngleDeg: 60, snapTolerancePercent: 80, enabledBlockTypes: ['move_forward'] }}
        submitLabel="Salvar alterações"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue('Hexágonos')).toBeInTheDocument();
    expect(screen.getByLabelText('Número de lados')).toHaveValue(6);
  });

  it('blocks saving and shows a non-technical message when no title was given', async () => {
    const onSubmit = vi.fn();
    render(<TemplateChallengeForm template={template} submitLabel="Salvar desafio" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /salvar desafio/i }));

    // A mensagem aparece duas vezes de propósito: inline sob o formulário
    // (persistente) e num Toast (transitório, ver Toast.tsx) - a mesma
    // frase pedagógica nos dois lugares, nunca duas mensagens diferentes.
    expect((await screen.findAllByText('Dê um nome para o desafio antes de salvar.')).length).toBeGreaterThan(0);
    expect(mockedPost).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('AC3 - blocks saving on an invalid combination, showing the pedagogical error under the right field', async () => {
    mockedPost.mockResolvedValueOnce({
      valid: false,
      errors: [{ parameterKey: 'turnAngleDeg', message: 'Com 3 lados e 200° de giro, o desenho não fecha.' }],
      goal: null,
    });
    const onSubmit = vi.fn();
    render(<TemplateChallengeForm template={template} submitLabel="Salvar desafio" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByPlaceholderText(/triângulos/i), 'Meu desafio');

    await userEvent.click(screen.getByRole('button', { name: /salvar desafio/i }));

    expect(await screen.findByText('Com 3 lados e 200° de giro, o desenho não fecha.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('saves with the title and current params once validation passes', async () => {
    mockedPost.mockResolvedValueOnce({ valid: true, errors: [], goal: { shape: 'regular_polygon', sides: 4, turnAngleDeg: 90 } });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TemplateChallengeForm template={template} submitLabel="Salvar desafio" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByPlaceholderText(/triângulos/i), 'Meu desafio');

    await userEvent.click(screen.getByRole('button', { name: /salvar desafio/i }));

    expect(await screen.findByRole('button', { name: /salvar desafio/i })).toBeEnabled();
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Meu desafio',
      params: { sides: 4, turnAngleDeg: 90, snapTolerancePercent: 60, enabledBlockTypes: ['move_forward', 'turn'] },
      feedbackMessages: { retry: '', success: '' },
      predictQuestion: template.primmQuestionSuggestion.predictQuestion,
      investigationQuestion: template.primmQuestionSuggestion.investigationQuestion,
    });
  });

  it('3.7 (AC4) - submits teacher-customized feedback messages alongside params', async () => {
    mockedPost.mockResolvedValueOnce({ valid: true, errors: [], goal: { shape: 'regular_polygon', sides: 4, turnAngleDeg: 90 } });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TemplateChallengeForm template={template} submitLabel="Salvar desafio" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByPlaceholderText(/triângulos/i), 'Meu desafio');
    await userEvent.type(
      screen.getByLabelText(/mensagem quando o aluno ainda não atingiu/i),
      'Esse ângulo ainda não fecha - quer ajustar?',
    );
    await userEvent.type(screen.getByLabelText(/mensagem de sucesso/i), 'Mandou bem!');

    await userEvent.click(screen.getByRole('button', { name: /salvar desafio/i }));

    expect(await screen.findByRole('button', { name: /salvar desafio/i })).toBeEnabled();
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        feedbackMessages: { retry: 'Esse ângulo ainda não fecha - quer ajustar?', success: 'Mandou bem!' },
      }),
    );
  });

  it('3.7 (AC4) - pre-fills feedback message fields when editing an already-customized challenge', () => {
    render(
      <TemplateChallengeForm
        template={template}
        submitLabel="Salvar alterações"
        initialFeedbackMessages={{ retry: 'Tente de novo com outro ângulo.' }}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/mensagem quando o aluno ainda não atingiu/i)).toHaveValue(
      'Tente de novo com outro ângulo.',
    );
    expect(screen.getByLabelText(/mensagem de sucesso/i)).toHaveValue('');
  });

  it('AC4 - "Visualizar como aluno" opens a functional preview in the game engine when parameters are valid', async () => {
    mockedPost.mockResolvedValueOnce({ valid: true, errors: [], goal: { shape: 'regular_polygon', sides: 4, turnAngleDeg: 90 } });
    render(<TemplateChallengeForm template={template} submitLabel="Salvar desafio" onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /visualizar como aluno/i }));

    expect(await screen.findByTestId('pixi-turtle-world-stub')).toBeInTheDocument();
    expect(mockedPost).toHaveBeenCalledWith('/challenge-templates/template-1/preview', {
      params: { sides: 4, turnAngleDeg: 90, snapTolerancePercent: 60, enabledBlockTypes: ['move_forward', 'turn'] },
    });
  });

  it('AC3/AC4 - "Visualizar como aluno" shows the pedagogical error instead of a preview for an invalid combination', async () => {
    mockedPost.mockResolvedValueOnce({
      valid: false,
      errors: [{ parameterKey: 'snapTolerancePercent', message: 'A tolerância de encaixe não pode ficar em 0%.' }],
      goal: null,
    });
    render(<TemplateChallengeForm template={template} submitLabel="Salvar desafio" onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /visualizar como aluno/i }));

    expect(await screen.findByText('A tolerância de encaixe não pode ficar em 0%.')).toBeInTheDocument();
    expect(screen.queryByTestId('pixi-turtle-world-stub')).not.toBeInTheDocument();
  });

  it('focuses the title field and shows a toast when the professor tries to save without a title, instead of silently doing nothing', async () => {
    render(<TemplateChallengeForm template={template} submitLabel="Salvar desafio" onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /salvar desafio/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Dê um nome para o desafio antes de salvar.');
    expect(screen.getByLabelText(/nome do desafio/i)).toHaveFocus();
  });

  it('focuses the first invalid field (in screen order) and shows a toast when saving is blocked by a pedagogical error', async () => {
    mockedPost.mockResolvedValueOnce({
      valid: false,
      errors: [{ parameterKey: 'turnAngleDeg', message: 'Com 3 lados e 200° de giro, o desenho não fecha.' }],
      goal: null,
    });
    render(<TemplateChallengeForm template={template} submitLabel="Salvar desafio" onSubmit={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/triângulos/i), 'Meu desafio');

    await userEvent.click(screen.getByRole('button', { name: /salvar desafio/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Alguns campos precisam de atenção antes de salvar.');
    expect(document.getElementById('template-param-field-turnAngleDeg')).toHaveFocus();
  });

  it('7.5 - surfaces a save-time pedagogical error (PRIMM question/feedback message, only checked on save) under its own field with a toast, never just a generic message at the bottom', async () => {
    mockedPost.mockResolvedValueOnce({ valid: true, errors: [], goal: { shape: 'regular_polygon', sides: 4, turnAngleDeg: 90 } });
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError('Escreva a pergunta de predição antes de salvar.', 400, [
          { parameterKey: 'predictQuestion', message: 'Escreva a pergunta de predição antes de salvar.' },
        ]),
      );
    render(<TemplateChallengeForm template={template} submitLabel="Salvar desafio" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByPlaceholderText(/triângulos/i), 'Meu desafio');

    await userEvent.click(screen.getByRole('button', { name: /salvar desafio/i }));

    expect(await screen.findByText('Alguns campos precisam de atenção antes de salvar.')).toBeInTheDocument();
    expect(screen.getAllByText('Escreva a pergunta de predição antes de salvar.').length).toBeGreaterThan(0);
    expect(document.getElementById('predict-question')).toHaveFocus();
  });

  it('AC4 - shows a toast/error instead of silently doing nothing when "Visualizar como aluno" fails at the network level', async () => {
    mockedPost.mockRejectedValueOnce(new Error('Falha de rede.'));
    render(<TemplateChallengeForm template={template} submitLabel="Salvar desafio" onSubmit={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /visualizar como aluno/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha de rede.');
    expect(screen.queryByTestId('pixi-turtle-world-stub')).not.toBeInTheDocument();
  });
});
