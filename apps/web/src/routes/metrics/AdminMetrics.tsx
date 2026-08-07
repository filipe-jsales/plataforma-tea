import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import './AdminMetrics.css';

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
// exclusiva de staff (admin) — sem as restrições sensoriais do aluno (regra
// não-negociável 1 é sobre a experiência do aluno; StaffLogin já estabelece
// esse mesmo racional), por isso o visual aqui é mais denso/colorido do que
// as telas do aluno.
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
    <main className="admin-metrics">
      <Link to="/home" className="admin-metrics__back-link">
        ← Voltar
      </Link>
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
            <button
              key={school.id}
              type="button"
              className={`admin-metrics__school-card${
                school.id === selectedSchoolId ? ' admin-metrics__school-card--selected' : ''
              }`}
              onClick={() => setSelectedSchoolId(school.id === selectedSchoolId ? null : school.id)}
            >
              <span className="admin-metrics__school-name">{school.name}</span>
              <span className="admin-metrics__school-stats">
                <SchoolStat value={school.classroomsCount} label="turmas" />
                <SchoolStat value={school.teachersCount} label="professores" />
                <SchoolStat value={school.activeStudentsCount} label="alunos ativos" />
                <SchoolStat value={school.activeStudentsToday} label="ativos hoje" />
              </span>
            </button>
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
            <ul className="admin-metrics__classrooms">
              {classrooms.map((classroom) => (
                <li key={classroom.id} className="admin-metrics__classroom">
                  <span className="admin-metrics__classroom-name">{classroom.name}</span>
                  <span className="admin-metrics__classroom-teacher">
                    {classroom.teacherDisplayName ?? (
                      <em className="admin-metrics__classroom-teacher--missing">
                        sem professor definido
                      </em>
                    )}
                  </span>
                  <span className="admin-metrics__classroom-count">
                    {classroom.activeStudentsCount} aluno
                    {classroom.activeStudentsCount === 1 ? '' : 's'} ativo
                    {classroom.activeStudentsCount === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
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
