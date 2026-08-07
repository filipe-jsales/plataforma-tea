import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/apiClient';
import { AllocationDialog } from './AllocationDialog';

vi.mock('../../lib/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);
const mockedDelete = vi.mocked(apiClient.delete);

const classroomA = { id: 'classroom-1', name: 'Turma A', joinCode: 'AZUL-1' };
const classroomB = { id: 'classroom-2', name: 'Turma B', joinCode: 'AZUL-2' };

beforeEach(() => {
  mockedGet.mockReset();
  mockedPost.mockReset();
  mockedDelete.mockReset();
});

describe('AllocationDialog', () => {
  it('AC1 — lists only the teacher\'s own classrooms (reusing GET /home/teacher), never every classroom in the school', async () => {
    mockedGet.mockResolvedValueOnce([classroomA, classroomB]);
    mockedGet.mockResolvedValueOnce([]);

    render(
      <AllocationDialog challengeId="challenge-1" challengeTitle="Hexágonos" open onOpenChange={vi.fn()} />,
    );

    expect(await screen.findByText('Turma A (AZUL-1)')).toBeInTheDocument();
    expect(screen.getByText('Turma B (AZUL-2)')).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith('/teacher/challenges/challenge-1/allocations');
  });

  it('reflects the classrooms this challenge is already allocated to as "on"', async () => {
    mockedGet.mockResolvedValueOnce([classroomA, classroomB]);
    mockedGet.mockResolvedValueOnce([{ classroomId: 'classroom-1', classroomName: 'Turma A', classroomJoinCode: 'AZUL-1' }]);

    render(
      <AllocationDialog challengeId="challenge-1" challengeTitle="Hexágonos" open onOpenChange={vi.fn()} />,
    );

    expect(await screen.findByRole('switch', { name: /turma a/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /turma b/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('AC2 — turning a classroom on immediately allocates the challenge, no separate "save" step', async () => {
    mockedGet.mockResolvedValueOnce([classroomA]);
    mockedGet.mockResolvedValueOnce([]);
    mockedPost.mockResolvedValueOnce({ classroomId: 'classroom-1', classroomName: 'Turma A', classroomJoinCode: 'AZUL-1' });

    render(
      <AllocationDialog challengeId="challenge-1" challengeTitle="Hexágonos" open onOpenChange={vi.fn()} />,
    );
    const toggle = await screen.findByRole('switch', { name: /turma a/i });
    await userEvent.click(toggle);

    expect(mockedPost).toHaveBeenCalledWith('/teacher/challenges/challenge-1/allocations', {
      classroomId: 'classroom-1',
    });
    expect(await screen.findByRole('switch', { name: /turma a/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('AC5 — turning an allocated classroom off removes only that link', async () => {
    mockedGet.mockResolvedValueOnce([classroomA]);
    mockedGet.mockResolvedValueOnce([{ classroomId: 'classroom-1', classroomName: 'Turma A', classroomJoinCode: 'AZUL-1' }]);
    mockedDelete.mockResolvedValueOnce(undefined);

    render(
      <AllocationDialog challengeId="challenge-1" challengeTitle="Hexágonos" open onOpenChange={vi.fn()} />,
    );
    const toggle = await screen.findByRole('switch', { name: /turma a/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(toggle);

    expect(mockedDelete).toHaveBeenCalledWith('/teacher/challenges/challenge-1/allocations/classroom-1');
    expect(await screen.findByRole('switch', { name: /turma a/i })).toHaveAttribute('aria-checked', 'false');
  });

  it('shows a non-technical message when the teacher has no classroom yet', async () => {
    mockedGet.mockResolvedValueOnce([]);
    mockedGet.mockResolvedValueOnce([]);

    render(
      <AllocationDialog challengeId="challenge-1" challengeTitle="Hexágonos" open onOpenChange={vi.fn()} />,
    );

    expect(await screen.findByText(/você ainda não tem nenhuma turma/i)).toBeInTheDocument();
  });
});
