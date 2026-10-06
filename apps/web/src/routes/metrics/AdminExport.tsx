import { useEffect, useState } from 'react';
import { apiClient, ApiError } from '../../lib/apiClient';
import { Button, InlineFeedback, LinkButton, Select } from '../../components/ui';
import './AdminExport.css';
import { ArrowDownToLine } from 'lucide-react';

interface SchoolOption {
  id: string;
  name: string;
}

interface ChallengeOption {
  id: string;
  title: string;
  topicName: string;
}

interface ExportEventRow {
  id: string;
  studentPseudoId: string;
  category: string;
  type: string;
  payload: Record<string, unknown>;
  sessionId: string | null;
  challengeId: string | null;
  createdAt: string;
}

interface ExportResult {
  rows: ExportEventRow[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

type ExportFormat = 'json' | 'csv';

const NO_FILTER = '__all__';

const FORMAT_OPTIONS: { value: string; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV (planilha)' },
];

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildQuery(params: {
  schoolId: string;
  challengeId: string;
  from: string;
  to: string;
  format: ExportFormat;
}): string {
  const search = new URLSearchParams();
  if (params.schoolId !== NO_FILTER) search.set('schoolId', params.schoolId);
  if (params.challengeId !== NO_FILTER) search.set('challengeId', params.challengeId);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  search.set('format', params.format);
  return search.toString();
}

// 6.6 - exportação de dados brutos pra análise externa (RQ5 por completo:
// é o que efetivamente viabiliza usar os dados coletados desde o MVP num
// artigo/análise fora da plataforma, não só guardar num banco que ninguém
// consulta). O admin escolhe um recorte (escola, desafio e/ou período - ao
// menos um) e baixa um arquivo (JSON ou CSV) - nunca visualiza os dados
// crus na própria tela, o objetivo é analisar FORA da plataforma.
export function AdminExport() {
  const [schools, setSchools] = useState<SchoolOption[] | null>(null);
  const [challenges, setChallenges] = useState<ChallengeOption[] | null>(null);

  const [schoolId, setSchoolId] = useState(NO_FILTER);
  const [challengeId, setChallengeId] = useState(NO_FILTER);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [format, setFormat] = useState<ExportFormat>('json');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<SchoolOption[]>('/metrics/admin/schools').then(setSchools);
    apiClient.get<ChallengeOption[]>('/metrics/admin/challenges').then(setChallenges);
  }, []);

  const hasAnyFilter = schoolId !== NO_FILTER || challengeId !== NO_FILTER || Boolean(from || to);
  const periodIncomplete = Boolean(from) !== Boolean(to);

  async function handleExport() {
    setError(null);
    setSummary(null);

    if (!hasAnyFilter) {
      setError('Escolha ao menos um filtro: escola, desafio ou período.');
      return;
    }
    if (periodIncomplete) {
      setError('Informe as duas datas do período (início e fim), ou nenhuma das duas.');
      return;
    }

    setLoading(true);
    try {
      const query = buildQuery({ schoolId, challengeId, from, to, format });
      const timestamp = new Date().toISOString().slice(0, 10);

      if (format === 'csv') {
        const { text } = await apiClient.getRaw(`/metrics/admin/export?${query}`);
        downloadFile(text, `interaction-events-${timestamp}.csv`, 'text/csv;charset=utf-8');
        const lineCount = Math.max(text.split('\n').filter((line) => line.trim()).length - 1, 0);
        setSummary(`${lineCount} linha(s) exportada(s) - arquivo CSV baixado.`);
      } else {
        const result = await apiClient.get<ExportResult>(`/metrics/admin/export?${query}`);
        downloadFile(JSON.stringify(result.rows, null, 2), `interaction-events-${timestamp}.json`, 'application/json');
        setSummary(
          `${result.rows.length} linha(s) exportada(s) - arquivo JSON baixado.` +
            (result.hasMore
              ? ' Existem mais linhas além desta página - reduza o recorte (ex.: um período menor) para exportar tudo.'
              : ''),
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível exportar agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-export staff-theme page">
      <LinkButton to="/home" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Exportar dados brutos</h1>
      <p className="admin-export__subtitle">
        Escolha um recorte (escola, desafio e/ou período) e baixe os eventos de interação quase
        crus, prontos pra analisar fora da plataforma - cada linha é pseudonimizada, nunca traz o
        nome do aluno.
      </p>

      <div className="admin-export__form">
        <Select
          id="admin-export-school"
          label="Escola"
          value={schoolId}
          onValueChange={setSchoolId}
          options={[
            { value: NO_FILTER, label: 'Todas as escolas' },
            ...(schools ?? []).map((school) => ({ value: school.id, label: school.name })),
          ]}
        />

        <Select
          id="admin-export-challenge"
          label="Desafio"
          value={challengeId}
          onValueChange={setChallengeId}
          options={[
            { value: NO_FILTER, label: 'Todos os desafios' },
            ...(challenges ?? []).map((challenge) => ({
              value: challenge.id,
              label: `${challenge.topicName} - ${challenge.title}`,
            })),
          ]}
        />

        <div className="admin-export__period">
          <label className="admin-export__date-field">
            <span>Período - de</span>
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="admin-export__date-field">
            <span>até</span>
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
        <p className="admin-export__hint">Período máximo: 90 dias por exportação.</p>

        <Select
          id="admin-export-format"
          label="Formato do arquivo"
          value={format}
          onValueChange={(value) => setFormat(value as ExportFormat)}
          options={FORMAT_OPTIONS}
        />

        {error && <InlineFeedback kind="retry">{error}</InlineFeedback>}
        {summary && <InlineFeedback kind="success">{summary}</InlineFeedback>}

        <Button icon={<ArrowDownToLine />} onClick={handleExport} disabled={loading}>
          {loading ? 'Exportando…' : 'Baixar exportação'}
        </Button>
      </div>
    </main>
  );
}
