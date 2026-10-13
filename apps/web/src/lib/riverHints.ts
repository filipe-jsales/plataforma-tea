import type { RoundId } from './riverCrossing';

export interface RiverHint {
  number: number;
  text: string;
  // Desconto da nota previsto no plano de aula. O jogo não tem pontuação:
  // o valor só é registrado no evento, para o docente cruzar depois.
  discountPoints: number;
}

// Textos e descontos do plano de aula (Apêndice A, cartas de dica).
export const RIVER_HINTS: Record<RoundId, RiverHint[]> = {
  1: [
    {
      number: 1,
      discountPoints: 0.25,
      text: 'Há dois primeiros movimentos válidos. Descubram quais são eliminando os outros, um a um, pelas regras.',
    },
    {
      number: 2,
      discountPoints: 0.5,
      text: 'Sem o Lobo, os conflitos são Ovelha com Alface, Galinha com Alface e Cachorro com Galinha. Os dois primeiros barcos levam a Alface e mais uma peça.',
    },
    {
      number: 3,
      discountPoints: 0.75,
      text: 'A Ovelha atravessa sozinha. Quando ela chega à margem D, a Alface não pode estar lá: a Alface volta no barco. Depois falta levar as duas peças que ficaram.',
    },
  ],
  2: [
    {
      number: 1,
      discountPoints: 0.25,
      text: 'Há um único primeiro movimento válido. Descubram qual é eliminando os outros, um a um, pelas regras.',
    },
    {
      number: 2,
      discountPoints: 0.25,
      text: 'Olhem a margem E depois que o barco sai. Alface com Ovelha ou com Galinha é conflito. Se a Alface ficar, sempre sobra um conflito: ela vai no primeiro barco.',
    },
    {
      number: 3,
      discountPoints: 0.5,
      text: 'A Alface vai, mas sozinha não basta: Cachorro e Galinha ficariam juntos. Se o Cachorro for, Lobo e Ovelha ficam sem protetor. Então a Galinha vai: Alface e Galinha.',
    },
    {
      number: 4,
      discountPoints: 0.5,
      text: 'Nem toda travessia precisa levar carga, e trazer alguém de volta pode ser necessário. Procurem situações em que o Cachorro protege a Ovelha.',
    },
    {
      number: 5,
      discountPoints: 0.75,
      text: 'Anotem quem está em cada margem depois de cada travessia. Se uma situação já apareceu antes, vocês estão andando em círculo.',
    },
  ],
};
