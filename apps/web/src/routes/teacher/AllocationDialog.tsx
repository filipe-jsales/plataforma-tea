import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import type { ClassroomAllocationSummary, TeacherClassroomOption } from '../../lib/challengeAllocationTypes';
import { Dialog, InlineFeedback, ToggleSwitch } from '../../components/ui';

export interface AllocationDialogProps {
  challengeId: string;
  challengeTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 4.3 (AC1/AC2/AC5) — o professor liga/desliga a presença do desafio em
// cada uma das PRÓPRIAS turmas (nunca todas as turmas da escola — AC1;
// `GET /home/teacher`, já existente desde 2.1, já é escopado ao professor
// autenticado, reaproveitado aqui sem endpoint novo). Efeito imediato: cada
// toggle chama POST/DELETE na hora, sem um botão "Salvar" separado — a
// mesma linha que autoriza a alocação já é o que a área do aluno lê (AC2).
export function AllocationDialog({ challengeId, challengeTitle, open, onOpenChange }: AllocationDialogProps) {
  const [classrooms, setClassrooms] = useState<TeacherClassroomOption[] | null>(null);
  const [allocatedClassroomIds, setAllocatedClassroomIds] = useState<Set<string>>(new Set());
  const [pendingClassroomId, setPendingClassroomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    Promise.all([
      apiClient.get<TeacherClassroomOption[]>('/home/teacher'),
      apiClient.get<ClassroomAllocationSummary[]>(`/teacher/challenges/${challengeId}/allocations`),
    ]).then(([teacherClassrooms, allocations]) => {
      setClassrooms(teacherClassrooms);
      setAllocatedClassroomIds(new Set(allocations.map((allocation) => allocation.classroomId)));
    });
  }, [open, challengeId]);

  async function handleToggle(classroomId: string, checked: boolean) {
    setPendingClassroomId(classroomId);
    setError(null);
    try {
      if (checked) {
        await apiClient.post(`/teacher/challenges/${challengeId}/allocations`, { classroomId });
        setAllocatedClassroomIds((current) => new Set(current).add(classroomId));
      } else {
        await apiClient.delete(`/teacher/challenges/${challengeId}/allocations/${classroomId}`);
        setAllocatedClassroomIds((current) => {
          const next = new Set(current);
          next.delete(classroomId);
          return next;
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar a alocação.');
    } finally {
      setPendingClassroomId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Alocar à turma"
      description={`Escolha em quais das suas turmas "${challengeTitle}" fica disponível para os alunos.`}
      headerClassName="ui-dialog__header--centered"
    >
      {classrooms === null && <p>Carregando turmas…</p>}
      {classrooms !== null && classrooms.length === 0 && (
        <p>Você ainda não tem nenhuma turma sob sua responsabilidade.</p>
      )}
      {classrooms !== null &&
        classrooms.map((classroom) => (
          <ToggleSwitch
            key={classroom.id}
            id={`allocation-${challengeId}-${classroom.id}`}
            label={`${classroom.name} (${classroom.joinCode})`}
            checked={allocatedClassroomIds.has(classroom.id)}
            disabled={pendingClassroomId === classroom.id}
            onCheckedChange={(checked) => handleToggle(classroom.id, checked)}
          />
        ))}
      {error && <InlineFeedback kind="retry">{error}</InlineFeedback>}
    </Dialog>
  );
}
