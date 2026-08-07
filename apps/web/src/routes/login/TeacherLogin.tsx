import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { completeLogin } from '../../lib/authFlow';
import { Button } from '../../components/ui';
import './StaffLogin.css';

// 1.2.1 — fluxo professor: e-mail + senha, microcópia sem jargão técnico
// (nunca menciona "token"/"JWT" — RQ4 barreiras institucionais, 17,39%).
export function TeacherLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await completeLogin(() => apiClient.post('/auth/teacher/login', { email, password }));
      navigate('/', { replace: true });
    } catch {
      setError('E-mail ou senha não conferem.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="staff-login staff-theme">
      <h1>Entrar como professor(a)</h1>
      <form onSubmit={handleSubmit}>
        {error && <p className="staff-login__error">{error}</p>}
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoFocus
            required
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <Button type="submit" disabled={loading} className="staff-login__submit">
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </main>
  );
}
