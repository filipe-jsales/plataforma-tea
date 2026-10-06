interface DecodedJwtPayload {
  exp?: number;
  [key: string]: unknown;
}

function decodeJwtPayload(token: string): DecodedJwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as DecodedJwtPayload;
  } catch {
    return null;
  }
}

// 1.5.1 - checagem OTIMISTA de expiração de sessão: só decodifica o
// payload (nunca valida assinatura no cliente - isso é sempre
// responsabilidade do backend a cada request, ver apiClient.ts). Existe
// pra mandar o aluno/professor/admin de volta pro login IMEDIATAMENTE ao
// abrir uma tela com token vencido, em vez de esperar a primeira chamada
// de API falhar. Token ilegível ou sem `exp` é tratado como expirado
// (falha seguro - nunca deixa passar por engano).
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return true;
  }
  return payload.exp * 1000 <= Date.now();
}
