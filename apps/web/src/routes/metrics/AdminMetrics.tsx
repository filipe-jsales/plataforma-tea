import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import {
  LinkButton,
  SelectableCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../components/ui';
import './AdminMetrics.css';
import { School } from 'lucide-react';

interface SchoolOverview {
  id: string;
  name: string;
  classroomsCount: number;
  teachersCount: number;
  activeStudentsCount: number;
  activeStudentsToday: number;
}

interface ClassroomOverview {
  id: string;
  name: string;
  teacherDisplayName: string | null;
  activeStudentsCount: number;
}

// 6.2 — painel institucional do admin: escolas → turmas → professor
// responsável, sem nenhum dado de aluno individual (AC de 6.2). Área
// exclusiva de staff (admin) — tema mais rico que o do aluno (3.11,
// `.staff-theme`), mesma fundação de componente (Radix/React Aria, ver
// components/ui/).
export function AdminMetrics() {
  const [schools, setSchools] = useState<SchoolOverview[] | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<ClassroomOverview[] | null>(null);

  useEffect(() => {
    apiClient.get<SchoolOverview[]>('/metrics/admin/schools').then(setSchools);
  }, []);

  useEffect(() => {
    if (!selectedSchoolId) {
      setClassrooms(null);
      return;
    }
    setClassrooms(null);
    apiClient
      .get<ClassroomOverview[]>(`/metrics/admin/schools/${selectedSchoolId}/classrooms`)
      .then(setClassrooms);
  }, [selectedSchoolId]);

  const selectedSchool = schools?.find((school) => school.id === selectedSchoolId) ?? null;

  return (
    <main className="admin-metrics staff-theme page">
      <LinkButton to="/home" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Painel institucional</h1>
      <p className="admin-metrics__subtitle">
        Como cada escola está usando a plataforma — turmas, professores e alunos ativos.
      </p>

      {schools === null && <p className="admin-metrics__loading">Carregando escolas…</p>}

      {schools !== null && schools.length === 0 && (
        <p className="admin-metrics__empty">Nenhuma escola cadastrada ainda.</p>
      )}

      {schools !== null && schools.length > 0 && (
        <div className="admin-metrics__schools">
          {schools.map((school) => (
            <SelectableCard
              key={school.id}
              align="start"
              icon={<School />}
              selected={school.id === selectedSchoolId}
              onSelect={() => setSelectedSchoolId(school.id === selectedSchoolId ? null : school.id)}
              meta={
                <span className="admin-metrics__school-stats">
                  <SchoolStat value={school.classroomsCount} label="turmas" />
                  <SchoolStat value={school.teachersCount} label="professores" />
                  <SchoolStat value={school.activeStudentsCount} label="alunos ativos" />
                  <SchoolStat value={school.activeStudentsToday} label="ativos hoje" />
                </span>
              }
            >
              {school.name}
            </SelectableCard>
          ))}
        </div>
      )}

      {selectedSchool && (
        <section className="admin-metrics__detail">
          <h2>Turmas de {selectedSchool.name}</h2>

          {classrooms === null && <p className="admin-metrics__loading">Carregando turmas…</p>}

          {classrooms !== null && classrooms.length === 0 && (
            <p className="admin-metrics__empty">Nenhuma turma cadastrada ainda nesta escola.</p>
          )}

          {classrooms !== null && classrooms.length > 0 && (
            <Table ariaLabel={`Turmas de ${selectedSchool.name}`}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Turma</TableHeaderCell>
                  <TableHeaderCell>Professor(a)</TableHeaderCell>
                  <TableHeaderCell>Alunos ativos</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {classrooms.map((classroom) => (
                  <TableRow key={classroom.id}>
                    <TableCell>{classroom.name}</TableCell>
                    <TableCell>
                      {classroom.teacherDisplayName ?? (
                        <em className="admin-metrics__classroom-teacher--missing">
                          sem professor definido
                        </em>
                      )}
                    </TableCell>
                    <TableCell>
                      {classroom.activeStudentsCount} aluno
                      {classroom.activeStudentsCount === 1 ? '' : 's'} ativo
                      {classroom.activeStudentsCount === 1 ? '' : 's'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      )}
    </main>
  );
}

function SchoolStat({ value, label }: { value: number; label: string }) {
  return (
    <span className="admin-metrics__stat">
      <span className="admin-metrics__stat-value">{value}</span>
      <span className="admin-metrics__stat-label">{label}</span>
    </span>
  );
}
