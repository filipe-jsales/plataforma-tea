// 1.4 - mesma forma que a API de admin/users devolve. Duplicado aqui de
// propósito (mesmo padrão de challengeAllocationTypes.ts - não há pacote
// compartilhado entre as duas apps neste monorepo).
export type UserRole = 'student' | 'teacher' | 'admin';

export interface AdminUserProfile {
  id: string;
  pseudonymId: string;
  displayName: string;
  email: string | null;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface PaginatedAdminUsers {
  items: AdminUserProfile[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateStaffUserResponse {
  user: AdminUserProfile;
  // Devolvidos só na resposta de criação - ver nota de gap de e-mail em
  // docs/ai/modules/backend.md: hoje não existe envio de e-mail de
  // verdade, o admin precisa repassar isto manualmente.
  passwordSetupToken: string;
  totpOtpauthUri: string | null;
}
