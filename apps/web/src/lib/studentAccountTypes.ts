// 1.2/A2 — mesma forma que a API de teacher/students devolve. Cadastro em
// dois passos reais desde A2: `PendingStudentAccount` (passo 1 — conta
// matriculada, sem credencial ainda) e `StudentAccountCredential` (passo
// 2/3 — credencial liberada só depois do consentimento do responsável
// legal).
export interface PendingStudentAccount {
  student: { id: string; displayName: string; pseudonymId: string };
  classroom: { id: string; name: string; joinCode: string };
  avatar: { label: string; assetRef: string };
  // AC: "tentativa de cadastro duplicado... gera alerta não bloqueante" — a
  // conta já foi criada quando este campo chega `true`.
  duplicateWarning: boolean;
}

export interface StudentAccountCredential {
  student: { id: string; displayName: string; pseudonymId: string };
  classroom: { id: string; name: string; joinCode: string };
  credential: {
    avatar: { label: string; assetRef: string };
    loginImages: { label: string; assetRef: string }[];
  };
}

// 1.3 — mesma forma que StudentAccountCredential: `POST
// /teacher/students/:id/reset-credential` devolve uma sequência de login
// NOVA pra um aluno já ativo que esqueceu a credencial.
export type ResetCredentialResult = StudentAccountCredential;
