import { logEvent } from './logEvent';
import { useAuthStore, type SessionUser } from '../stores/useAuthStore';

// 1.5.1 - logout é sempre local: JWT é stateless e não há endpoint de
// revogação no backend (mesma decisão já tomada pro resto da autenticação
// deste projeto - sem OAuth/sessão server-side). `logout` (RD-L) só é
// logado pro ALUNO - mesmo padrão de `login_success`/`login_attempt`
// (`interaction_events.studentPseudoId` é escopado a aluno de propósito;
// professor/admin nunca geram evento aqui, ver "Padrão: eventos RD-* são
// escopados ao aluno" em docs/ai/modules/backend.md).
export function performLogout(user: SessionUser): void {
  if (user.role === 'student') {
    logEvent({
      studentPseudoId: user.pseudonymId,
      category: 'RD-L',
      type: 'logout',
    });
  }
  useAuthStore.getState().clearSession();
}
