import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

// "Quem é você?" (login) → onboarding sensorial (só aluno, só 1ª vez) →
// home. Cada critério decidido num só lugar, não espalhado pelas telas.
export function RootRedirect() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'student' && !user.sensoryOnboardingCompletedAt) {
    return <Navigate to="/onboarding" replace />;
  }
  return <Navigate to="/home" replace />;
}
