import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { Button, InlineFeedback } from '../../components/ui';
import './StaffLogin.css';

const MIN_PASSWORD_LENGTH = 8;

// 1.4 - destino do link de definição de senha que o admin repassa ao
// professor/admin recém-criado (POST /auth/set-password, sem login prévio).
// Microcópia sem jargão: nunca fala em "token", só em "link".
export function SetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmation) {
      setError('As duas senhas não são iguais.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/set-password', { token, password });
      setDone(true);
    } catch {
      setError('Este link não é mais válido. Peça um novo link para quem criou a sua conta.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="staff-login staff-theme">
        <h1>Definir senha</h1>
        <InlineFeedback kind="retry">
          Este link está incompleto. Peça um novo link para quem criou a sua conta.
        </InlineFeedback>
      </main>
    );
  }

  if (done) {
    return (
      <main className="staff-login staff-theme">
        <h1>Senha definida</h1>
        <InlineFeedback kind="success">
          Pronto! Agora você já pode entrar com o seu e-mail e a nova senha.
        </InlineFeedback>
        <p>
          <Link to="/login">Ir para a tela de entrada</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="staff-login staff-theme">
      <h1>Definir senha</h1>
      <form onSubmit={handleSubmit}>
        {error && <p className="staff-login__error">{error}</p>}
        <label>
          Nova senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            autoFocus
            required
          />
        </label>
        <label>
          Repita a senha
          <input
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <Button type="submit" disabled={loading} className="staff-login__submit">
          {loading ? 'Salvando…' : 'Salvar senha'}
        </Button>
      </form>
    </main>
  );
}
