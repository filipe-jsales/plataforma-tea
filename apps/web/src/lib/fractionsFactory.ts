// Lógica pura do 1º mini jogo de conteúdo ("Fábrica de Pedaços Iguais",
// frações) — ver docs/ai/backlog/mini-jogo-fabrica-pedacos-iguais.md.
// Sem I/O, sem Pixi/React: testável isolado (fractionsFactory.spec.ts),
// mesmo racional de turtleWorld.ts (fechamento geométrico calculado no
// cliente) e statistics.ts do backend (cálculo em código puro).
//
// Decisão de design (ver plano/backlog): "Repetir corte" é deliberadamente
// SEM efeito matemático — reforça a percepção de iteração/repetição sem
// amarrar o denominador a potências de 2. `cutEqualParts.parts` já define o
// denominador diretamente.

export type FractionsFactoryCard =
  | { type: 'choose_whole' }
  | { type: 'cut_equal_parts'; parts: number }
  | { type: 'repeat_cut' }
  | { type: 'separate_pieces'; count: number }
  | { type: 'deliver_order' };

export interface FractionsFactoryFraction {
  numerator: number;
  denominator: number;
}

export interface SimulationResult {
  totalParts: number | null;
  deliveredParts: number | null;
  repeatCutCount: number;
  valid: boolean;
  // Mensagens descritivas e reversíveis (regra não-negociável 4) — nunca
  // "errado"/"inválido" sozinho, sempre explicando o quê e convidando a
  // ajustar.
  errors: string[];
}

const MIN_PARTS = 2;
const MAX_PARTS = 8;

// Anda a sequência cartão a cartão, validando ordem e parâmetros — nunca
// lança exceção, sempre devolve um resultado descritivo (mesmo espírito de
// isChallengeConfig/ChallengeTemplateHandler.validateParameters no
// backend: "quase lá, quer ajustar?", não um erro técnico).
export function simulateSequence(cards: FractionsFactoryCard[]): SimulationResult {
  const errors: string[] = [];
  let totalParts: number | null = null;
  let deliveredParts: number | null = null;
  let repeatCutCount = 0;
  let sawChooseWhole = false;
  let sawCutEqualParts = false;
  let sawDeliverOrder = false;

  if (cards.length === 0) {
    return {
      totalParts: null,
      deliveredParts: null,
      repeatCutCount: 0,
      valid: false,
      errors: ['A sequência está vazia — adicione ao menos um cartão para começar.'],
    };
  }

  cards.forEach((card, index) => {
    switch (card.type) {
      case 'choose_whole': {
        if (index !== 0) {
          errors.push('"Escolher o inteiro" precisa ser o primeiro cartão da sequência.');
        }
        sawChooseWhole = true;
        break;
      }
      case 'cut_equal_parts': {
        if (!sawChooseWhole) {
          errors.push('"Cortar em partes iguais" só faz sentido depois de escolher o inteiro.');
        }
        if (sawCutEqualParts) {
          errors.push('Só é preciso um cartão de "Cortar em partes iguais" por pedido.');
        }
        if (card.parts < MIN_PARTS || card.parts > MAX_PARTS) {
          errors.push(`O número de partes deve estar entre ${MIN_PARTS} e ${MAX_PARTS}.`);
        } else {
          totalParts = card.parts;
        }
        sawCutEqualParts = true;
        break;
      }
      case 'repeat_cut': {
        if (!sawCutEqualParts) {
          errors.push('"Repetir corte" só faz sentido depois de cortar em partes iguais.');
        }
        repeatCutCount += 1;
        break;
      }
      case 'separate_pieces': {
        if (!sawCutEqualParts) {
          errors.push('"Separar pedaço(s)" só faz sentido depois de cortar em partes iguais.');
        }
        if (totalParts !== null && (card.count < 1 || card.count >= totalParts)) {
          errors.push(`O número de pedaços separados deve ser entre 1 e ${totalParts - 1}.`);
        }
        deliveredParts = card.count;
        break;
      }
      case 'deliver_order': {
        if (index !== cards.length - 1) {
          errors.push('"Entregar pedido" precisa ser o último cartão da sequência.');
        }
        sawDeliverOrder = true;
        break;
      }
    }
  });

  if (!sawChooseWhole) errors.push('Falta o cartão "Escolher o inteiro".');
  if (!sawCutEqualParts) errors.push('Falta o cartão "Cortar em partes iguais".');
  if (deliveredParts === null) errors.push('Falta o cartão "Separar pedaço(s)".');
  if (!sawDeliverOrder) errors.push('Falta o cartão "Entregar pedido".');

  return {
    totalParts,
    deliveredParts,
    repeatCutCount,
    valid: errors.length === 0,
    errors,
  };
}

// Compara o resultado da simulação ao pedido (fração-alvo) — só bate se a
// sequência é válida E os números batem exatamente (mesma definição de
// fração ensinada pelo jogo: partes iguais de um todo).
export function matchesTarget(result: SimulationResult, target: FractionsFactoryFraction): boolean {
  return (
    result.valid &&
    result.totalParts === target.denominator &&
    result.deliveredParts === target.numerator
  );
}
