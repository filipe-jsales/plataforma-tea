import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { Button, LinkButton } from '../../components/ui';
import './AdminSettings.css';

interface PlatformSettings {
  id: string;
  minSampleSizeThreshold: number;
  updatedAt: string;
}

// 6.5 - configuração de N mínimo pro aviso de amostra pequena no relatório
// de profundidade por desafio. Tela mínima de propósito (AC: "não precisa
// ser dedicada, pode ser parte de uma tela geral de Configurações") - só
// este campo hoje, mas já isolada num componente/rota própria pra crescer
// sem virar um formulário emaranhado dentro de outra tela.
export function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<PlatformSettings>('/admin/settings').then((result) => {
      setSettings(result);
      setDraft(String(result.minSampleSizeThreshold));
    });
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(draft);
    if (!Number.isInteger(value) || value < 1) {
      setError('Informe um número inteiro positivo.');
      return;
    }
    setError(null);
    setSaving(true);
    setSavedMessage(null);
    try {
      const result = await apiClient.patch<PlatformSettings>('/admin/settings', {
        minSampleSizeThreshold: value,
      });
      setSettings(result);
      setSavedMessage('Configuração salva.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-settings staff-theme page page--narrow">
      <LinkButton to="/home" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Configurações</h1>

      {settings === null && <p className="admin-settings__loading">Carregando…</p>}

      {settings !== null && (
        <form className="admin-settings__form" onSubmit={handleSubmit}>
          <label className="admin-settings__field">
            <span>N mínimo para aviso de amostra pequena</span>
            <input type="number" value={draft} onChange={(event) => setDraft(event.target.value)} />
          </label>
          <p className="admin-settings__hint">
            Sempre que uma estatística do relatório de profundidade por desafio (6.5) tiver
            menos alunos do que este valor, o relatório mostra um aviso de amostra pequena em
            vez de apresentar o número sem contexto. Alterar isto não recalcula nenhum dado
            histórico - só muda quando o aviso aparece.
          </p>
          {error && <p className="admin-settings__error">{error}</p>}
          {savedMessage && <p className="admin-settings__saved">{savedMessage}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </form>
      )}
    </main>
  );
}
