export type PieceId = 'wolf' | 'sheep' | 'lettuce' | 'dog' | 'chicken';
export type Bank = 'E' | 'D';
export type RoundId = 1 | 2;

export const PIECE_LABEL: Record<PieceId, string> = {
  wolf: 'Lobo',
  sheep: 'Ovelha',
  lettuce: 'Alface',
  dog: 'Cachorro',
  chicken: 'Galinha',
};

export const PIECE_WEIGHT: Record<PieceId, number> = {
  wolf: 2,
  sheep: 2,
  lettuce: 1,
  dog: 1,
  chicken: 1,
};

export interface RoundConfig {
  pieces: PieceId[];
  fuel: number;
}

// Rodada 1: o Lobo fica fora e o tanque tem 7 gotas. Rodada 2: todos jogam e
// o tanque tem 13 gotas.
export const ROUNDS: Record<RoundId, RoundConfig> = {
  1: { pieces: ['sheep', 'lettuce', 'dog', 'chicken'], fuel: 7 },
  2: { pieces: ['wolf', 'sheep', 'lettuce', 'dog', 'chicken'], fuel: 13 },
};

// Peso máximo do barco (3) menos o Fazendeiro (1), que nunca sai do barco.
export const BOAT_CARGO_CAPACITY = 2;

export interface ConflictRule {
  id: 'R1' | 'R2' | 'R3' | 'R4';
  predator: PieceId;
  prey: PieceId;
  // Peça cuja presença na mesma margem anula a regra.
  unlessPresent?: PieceId;
  description: string;
}

export const CONFLICT_RULES: ConflictRule[] = [
  {
    id: 'R1',
    predator: 'wolf',
    prey: 'sheep',
    unlessPresent: 'dog',
    description: 'O Lobo devora a Ovelha, exceto se o Cachorro estiver na margem.',
  },
  { id: 'R2', predator: 'sheep', prey: 'lettuce', description: 'A Ovelha devora a Alface.' },
  { id: 'R3', predator: 'chicken', prey: 'lettuce', description: 'A Galinha bica a Alface.' },
  { id: 'R4', predator: 'dog', prey: 'chicken', description: 'O Cachorro ataca a Galinha.' },
];

export interface RiverState {
  round: RoundId;
  bank: Partial<Record<PieceId, Bank>>;
  boat: Bank;
  fuel: number;
}

export function createInitialState(round: RoundId): RiverState {
  const bank: RiverState['bank'] = {};
  for (const piece of ROUNDS[round].pieces) bank[piece] = 'E';
  return { round, bank, boat: 'E', fuel: ROUNDS[round].fuel };
}

export function piecesOnBank(state: RiverState, side: Bank): PieceId[] {
  return ROUNDS[state.round].pieces.filter((piece) => state.bank[piece] === side);
}

export function cargoWeight(cargo: PieceId[]): number {
  return cargo.reduce((total, piece) => total + PIECE_WEIGHT[piece], 0);
}

export function canAddToCargo(cargo: PieceId[], piece: PieceId): boolean {
  return cargoWeight(cargo) + PIECE_WEIGHT[piece] <= BOAT_CARGO_CAPACITY;
}

export function findConflicts(present: PieceId[]): ConflictRule[] {
  return CONFLICT_RULES.filter(
    (rule) =>
      present.includes(rule.predator) &&
      present.includes(rule.prey) &&
      !(rule.unlessPresent && present.includes(rule.unlessPresent)),
  );
}

export function hasWon(state: RiverState): boolean {
  return ROUNDS[state.round].pieces.every((piece) => state.bank[piece] === 'D');
}

export type CrossingOutcome = 'ok' | 'conflict' | 'won' | 'lost';

export interface CrossingResult {
  outcome: CrossingOutcome;
  // Estado logo após o barco atravessar (carga já desembarcada) - é o que a
  // animação mostra antes de uma travessia inválida ser desfeita.
  arrived: RiverState;
  // Estado em que o jogo fica depois: igual a `arrived`, ou o estado anterior
  // com a gota gasta quando a travessia é desfeita.
  settled: RiverState;
  conflicts: ConflictRule[];
}

export function cross(state: RiverState, cargo: PieceId[]): CrossingResult {
  const destination: Bank = state.boat === 'E' ? 'D' : 'E';
  const bank = { ...state.bank };
  for (const piece of cargo) bank[piece] = destination;
  const fuel = state.fuel - 1;
  const arrived: RiverState = { ...state, bank, boat: destination, fuel };

  // Só a margem sem o barco é verificada.
  const conflicts = findConflicts(piecesOnBank(arrived, state.boat));
  if (conflicts.length > 0) {
    const settled: RiverState = { ...state, fuel };
    return { outcome: fuel <= 0 ? 'lost' : 'conflict', arrived, settled, conflicts };
  }
  if (hasWon(arrived)) return { outcome: 'won', arrived, settled: arrived, conflicts: [] };
  return { outcome: fuel <= 0 ? 'lost' : 'ok', arrived, settled: arrived, conflicts: [] };
}
