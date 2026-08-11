import { useEffect, type ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { isTokenExpired } from '../lib/jwt';
import { useAuthStore, type Role } from '../stores/useAuthStore';

interface RequireAuthProps {
  children: ReactElement;
  roles?: Role[];
}

// Guard de rota: sem sessão → tela "Quem é você?" (login ainda não
// implementado, ver LoginStub). Papel errado → home do papel certo, nunca
// uma tela de erro genérica.
//
// 1.5.1 — checa a EXPIRAÇÃO do token localmente (`isTokenExpired`), não só
// se existe um `user` salvo — sem isso, um token vencido (mas ainda
// presente no localStorage) deixava passar até a primeira chamada de API
// falhar (ver apiClient.ts pro tratamento de 401 em requisições já em
// voo). Aqui é a checagem PROATIVA: pega o caso "usuário abre uma aba/PC
// depois de 8h" antes de qualquer request sair.
export function RequireAuth({ children, roles }: RequireAuthProps) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const expired = token ? isTokenExpired(token) : false;

  useEffect(() => {
    if (token && expired) {
      useAuthStore.getState().clearSession();
    }
  }, [token, expired]);

  if (!user || !token || expired) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/home" replace />;
  }
  return children;
}
