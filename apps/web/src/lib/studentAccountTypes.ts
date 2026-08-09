// 1.2 — mesma forma que a API de teacher/students devolve.
export interface StudentAccountCredential {
  student: { id: string; displayName: string; pseudonymId: string };
  classroom: { id: string; name: string; joinCode: string };
  credential: {
    avatar: { label: string; assetRef: string };
    loginImages: { label: string; assetRef: string }[];
  };
  // AC: "tentativa de cadastro duplicado... gera alerta não bloqueante" — a
  // conta já foi criada quando este campo chega `true`.
  duplicateWarning: boolean;
}
