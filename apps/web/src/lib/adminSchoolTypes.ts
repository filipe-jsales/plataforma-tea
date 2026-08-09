// Gestão de escolas/turmas (admin) — mesma forma que a API devolve.
// Duplicado de propósito (mesmo padrão de adminUserTypes.ts — não há
// pacote compartilhado entre as duas apps neste monorepo).
export interface AdminSchoolProfile {
  id: string;
  name: string;
  externalId: string | null;
  active: boolean;
  deletedAt: string | null;
  createdAt: string;
}

export interface AdminClassroomProfile {
  id: string;
  schoolId: string;
  name: string;
  joinCode: string;
  teacherId: string | null;
  teacherName: string | null;
  active: boolean;
  deletedAt: string | null;
  createdAt: string;
}
