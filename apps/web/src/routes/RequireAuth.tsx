import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, type Role } from '../stores/useAuthStore';

interface RequireAuthProps {
  children: ReactElement;
  roles?: Role[];
}

// Guard de rota: sem sessão → tela "Quem é você?" (login ainda não
// implementado, ver LoginStub). Papel errado → home do papel certo, nunca
// uma tela de erro genérica.
export function RequireAuth({ children, roles }: RequireAuthProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/home" replace />;
  }
  return children;
}
