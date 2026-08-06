import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { completeLogin } from '../../lib/authFlow';
import './StaffLogin.css';

// 1.2.1 — fluxo admin: e-mail + senha + segundo fator. "otp" nunca aparece
// na tela — só "código do aplicativo autenticador" (sem jargão técnico).
export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await completeLogin(() => apiClient.post('/auth/admin/login', { email, password, otp }));
      navigate('/', { replace: true });
    } catch {
      setError('E-mail, senha ou código não conferem.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="staff-login">
      <h1>Entrar como administrador(a)</h1>
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
        <label>
          Código do aplicativo autenticador
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
