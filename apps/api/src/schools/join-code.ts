import { randomInt } from 'node:crypto';

// Palavras curtas, sem ambiguidade visual/fonética entre si — o aluno lê isso
// em voz alta ou o professor escreve na lousa, então precisa ser fácil de
// reconhecer sem exigir alfabetização plena.
const JOIN_CODE_WORDS = [
  'AZUL',
  'VERDE',
  'ROXO',
  'ROSA',
  'LARANJA',
  'AMARELO',
  'PRETO',
  'BRANCO',
  'MARROM',
  'CINZA',
];

// Ex.: "AZUL-7". Não garante unicidade global sozinho — a coluna tem
// UNIQUE no banco; colisão rara faria o INSERT falhar (aceitável no MVP,
// dado o volume esperado de turmas simultâneas). Ver
// docs/ai/modules/database.md.
export function generateJoinCode(): string {
  const word = JOIN_CODE_WORDS[randomInt(JOIN_CODE_WORDS.length)];
  const digit = randomInt(1, 10);
  return `${word}-${digit}`;
}
