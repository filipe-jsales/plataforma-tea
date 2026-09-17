import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { ChallengeCreationSurvey } from './ChallengeCreationSurvey';

vi.mock('../../lib/apiClient', () => ({
  apiClient: { post: vi.fn() },
}));

const mockedPost = vi.mocked(apiClient.post);

beforeEach(() => {
  mockedPost.mockReset();
});

describe('ChallengeCreationSurvey', () => {
  it('shows every quantitative statement and qualitative question', () => {
    render(<ChallengeCreationSurvey challengeId="challenge-1" onDone={vi.fn()} />);

    expect(screen.getByText('Foi fácil criar este desafio usando este formulário.')).toBeInTheDocument();
    expect(
      screen.getByText('O que foi mais difícil (se algo foi) durante a criação deste desafio?'),
    ).toBeInTheDocument();
  });

  it('never forces an answer — every Likert item starts unanswered and the qualitative fields start empty', () => {
    render(<ChallengeCreationSurvey challengeId="challenge-1" onDone={vi.fn()} />);

    expect(screen.getAllByRole('radiogroup')[0].querySelector('[data-state="on"]')).toBeNull();
    expect(
      screen.getByLabelText('O que foi mais difícil (se algo foi) durante a criação deste desafio?'),
    ).toHaveValue('');
  });

  it('submits answered Likert items as numbers, alongside the free-text answers', async () => {
    mockedPost.mockResolvedValueOnce(undefined);
    render(<ChallengeCreationSurvey challengeId="challenge-1" onDone={vi.fn()} />);

    await userEvent.click(screen.getAllByRole('radio', { name: 'Concordo totalmente' })[0]);
    await userEvent.type(
      screen.getByLabelText('O que foi mais difícil (se algo foi) durante a criação deste desafio?'),
      'Nada, foi tranquilo.',
    );
    await userEvent.click(screen.getByRole('button', { name: /enviar respostas/i }));

    expect(mockedPost).toHaveBeenCalledWith('/surveys/challenge-creation', {
      challengeId: 'challenge-1',
      status: 'submitted',
      quantitative: { ease_of_creation: 5 },
      qualitative: { difficulties: 'Nada, foi tranquilo.' },
    });
  });

  it('calls onDone after a successful submit', async () => {
    mockedPost.mockResolvedValueOnce(undefined);
    const onDone = vi.fn();
    render(<ChallengeCreationSurvey challengeId="challenge-1" onDone={onDone} />);

    await userEvent.click(screen.getByRole('button', { name: /enviar respostas/i }));

    expect(onDone).toHaveBeenCalled();
  });

  it('shows a retry message instead of silently failing when submit fails, and never calls onDone', async () => {
    mockedPost.mockRejectedValueOnce(new Error('Falha de rede.'));
    const onDone = vi.fn();
    render(<ChallengeCreationSurvey challengeId="challenge-1" onDone={onDone} />);

    await userEvent.click(screen.getByRole('button', { name: /enviar respostas/i }));

    expect(await screen.findByText('Falha de rede.')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('"Agora não" records a decline (never blocked by a network failure) and always calls onDone', async () => {
    mockedPost.mockRejectedValueOnce(new Error('Falha de rede.'));
    const onDone = vi.fn();
    render(<ChallengeCreationSurvey challengeId="challenge-1" onDone={onDone} />);

    await userEvent.click(screen.getByRole('button', { name: /agora não/i }));

    expect(mockedPost).toHaveBeenCalledWith('/surveys/challenge-creation', {
      challengeId: 'challenge-1',
      status: 'declined',
    });
    expect(onDone).toHaveBeenCalled();
  });
});
