import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bird,
  Cloud,
  Dog,
  Droplet,
  Fuel,
  PawPrint,
  Play,
  RotateCcw,
  Salad,
  Ship,
  TriangleAlert,
  Undo2,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Heading, InlineFeedback, LinkButton, Text } from '../../../components/ui';
import {
  BOAT_CARGO_CAPACITY,
  CONFLICT_RULES,
  PIECE_LABEL,
  PIECE_WEIGHT,
  ROUNDS,
  canAddToCargo,
  createInitialState,
  cross,
  piecesOnBank,
  type Bank,
  type ConflictRule,
  type PieceId,
  type RiverState,
  type RoundId,
} from '../../../lib/riverCrossing';
import './RiverCrossingPage.css';

const PIECE_ICON: Record<PieceId, ReactNode> = {
  wolf: <PawPrint />,
  sheep: <Cloud />,
  lettuce: <Salad />,
  dog: <Dog />,
  chicken: <Bird />,
};

// Duração do barco atravessando (casa com a transição de `left` no CSS) e
// tempo que o conflito fica visível antes de a travessia ser desfeita.
export const CROSSING_MS = 700;
export const CONFLICT_MS = 1500;

type Phase = 'rules' | 'play';
type Result = 'won' | 'lost' | null;

type Feedback =
  | { kind: 'info' | 'retry' | 'success'; text: string }
  | null;

function conflictText(conflicts: ConflictRule[]): string {
  return conflicts.map((rule) => `${rule.id}: ${rule.description}`).join(' ');
}

export interface RiverCrossingTiming {
  crossingMs: number;
  conflictMs: number;
}

const DEFAULT_TIMING: RiverCrossingTiming = { crossingMs: CROSSING_MS, conflictMs: CONFLICT_MS };

export function RiverCrossingPage({ timing = DEFAULT_TIMING }: { timing?: RiverCrossingTiming }) {
  const [phase, setPhase] = useState<Phase>('rules');
  const [state, setState] = useState<RiverState>(() => createInitialState(2));
  const [cargo, setCargo] = useState<PieceId[]>([]);
  const [boatSide, setBoatSide] = useState<Bank>('E');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [conflictBank, setConflictBank] = useState<Bank | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const startRound = (round: RoundId) => {
    clearTimers();
    setState(createInitialState(round));
    setBoatSide('E');
    setCargo([]);
    setBusy(false);
    setResult(null);
    setConflictBank(null);
    setFeedback(null);
    setPhase('play');
  };

  const toggleOnBoat = (piece: PieceId) => {
    if (busy || result) return;
    if (cargo.includes(piece)) {
      setCargo(cargo.filter((p) => p !== piece));
      setFeedback(null);
      return;
    }
    if (!canAddToCargo(cargo, piece)) {
      setFeedback({
        kind: 'info',
        text: `O barco leva o Fazendeiro e carga de até peso ${BOAT_CARGO_CAPACITY}. Tire alguém do barco para colocar ${PIECE_LABEL[piece]}.`,
      });
      return;
    }
    setCargo([...cargo, piece]);
    setFeedback(null);
  };

  const handleCross = () => {
    if (busy || result) return;
    const outcome = cross(state, cargo);
    const origin = state.boat;
    setBusy(true);
    setFeedback(null);
    setBoatSide(outcome.arrived.boat);

    later(() => {
      setState(outcome.arrived);
      setCargo([]);

      if (outcome.conflicts.length > 0) {
        setConflictBank(origin);
        setFeedback({
          kind: 'retry',
          text: `Conflito na margem ${origin}. ${conflictText(outcome.conflicts)} A travessia será desfeita, mas a gota continua gasta.`,
        });
        later(() => {
          setConflictBank(null);
          setState(outcome.settled);
          setBoatSide(outcome.settled.boat);
          setBusy(false);
          if (outcome.outcome === 'lost') {
            setResult('lost');
            setFeedback(null);
          } else {
            setFeedback({ kind: 'info', text: 'Travessia desfeita. Quer tentar outra carga?' });
          }
        }, timing.conflictMs);
        return;
      }

      setBusy(false);
      if (outcome.outcome === 'won') {
        setResult('won');
      } else if (outcome.outcome === 'lost') {
        setResult('lost');
      }
    }, timing.crossingMs);
  };

  if (phase === 'rules') {
    return (
      <main className="river-page staff-theme">
        <RulesView onStart={startRound} />
      </main>
    );
  }

  const config = ROUNDS[state.round];
  const canCross = !busy && !result;

  return (
    <main className="river-page staff-theme" data-result={result ?? undefined}>
      <header className="river-page__header">
        <LinkButton to="/subjects" variant="secondary" icon={<ArrowLeft />}>
          Voltar
        </LinkButton>
        <Heading level={1}>Travessia do Rio</Heading>
        <Button variant="secondary" icon={<BookOpen />} onClick={() => setPhase('rules')} disabled={busy}>
          Ver regras
        </Button>
      </header>

      <section className="river-page__status" aria-label="Situação da rodada">
        <Text>
          <strong>{state.round === 1 ? 'Rodada 1 (aquecimento)' : 'Rodada 2 (jogo completo)'}</strong>
        </Text>
        <FuelTank fuel={state.fuel} total={config.fuel} />
      </section>

      <div className="river" data-testid="river">
        <BankView
          side="E"
          title="Margem E"
          pieces={piecesOnBank(state, 'E').filter((p) => !cargo.includes(p))}
          interactive={boatSide === 'E' && canCross}
          conflict={conflictBank === 'E'}
          onPick={toggleOnBoat}
        />

        <div className="river__water">
          <div className="river__boat" data-side={boatSide} data-testid="boat">
            <Ship aria-hidden="true" />
            <Text size="sm">Fazendeiro (peso 1)</Text>
            <ul className="river__cargo" aria-label="Carga no barco">
              {cargo.length === 0 && <li className="river__cargo-empty">Sem carga</li>}
              {cargo.map((piece) => (
                <li key={piece}>
                  <Button
                    variant="secondary"
                    icon={PIECE_ICON[piece]}
                    onClick={() => toggleOnBoat(piece)}
                    disabled={!canCross}
                    aria-label={`Tirar ${PIECE_LABEL[piece]} do barco`}
                  >
                    {PIECE_LABEL[piece]}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <BankView
          side="D"
          title="Margem D"
          pieces={piecesOnBank(state, 'D').filter((p) => !cargo.includes(p))}
          interactive={boatSide === 'D' && canCross}
          conflict={conflictBank === 'D'}
          onPick={toggleOnBoat}
        />
      </div>

      <div className="river-page__actions">
        <Button
          variant="primary"
          icon={<ArrowRight />}
          onClick={handleCross}
          disabled={!canCross}
        >
          {boatSide === 'E' ? 'Atravessar para a margem D' : 'Atravessar para a margem E'}
        </Button>
        <Button variant="secondary" icon={<RotateCcw />} onClick={() => startRound(state.round)} disabled={busy}>
          Recomeçar
        </Button>
      </div>

      <div aria-live="polite" className="river-page__feedback">
        {feedback && <InlineFeedback kind={feedback.kind} icon={feedback.kind === 'retry' ? <TriangleAlert /> : undefined}>{feedback.text}</InlineFeedback>}
      </div>

      {result === 'won' && (
        <section className="river-page__result river-page__result--won" role="status">
          <Heading level={2}>Todos chegaram à margem D</Heading>
          <Text>
            Você atravessou em {config.fuel - state.fuel} viagens, sobrando {state.fuel}{' '}
            {state.fuel === 1 ? 'gota' : 'gotas'} de combustível.
          </Text>
          <div className="river-page__actions">
            <Button variant="success" icon={<Play />} onClick={() => startRound(state.round)}>
              Jogar de novo
            </Button>
            {state.round === 1 && (
              <Button variant="primary" icon={<ArrowRight />} onClick={() => startRound(2)}>
                Ir para a rodada 2
              </Button>
            )}
          </div>
        </section>
      )}

      {result === 'lost' && (
        <section className="river-page__result river-page__result--lost" role="status">
          <Heading level={2}>O combustível acabou</Heading>
          <Text>O tanque ficou vazio antes de todos chegarem. Dá para recomeçar e tentar outro caminho.</Text>
          <div className="river-page__actions">
            <Button variant="primary" icon={<Undo2 />} onClick={() => startRound(state.round)}>
              Tentar de novo
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}

function FuelTank({ fuel, total }: { fuel: number; total: number }) {
  return (
    <div className="river-fuel" role="img" aria-label={`Combustível: ${fuel} de ${total} gotas`}>
      <Fuel aria-hidden="true" />
      <span className="river-fuel__drops" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <Droplet key={index} data-used={index >= fuel ? 'true' : undefined} />
        ))}
      </span>
      <span>
        {fuel} de {total}
      </span>
    </div>
  );
}

interface BankViewProps {
  side: Bank;
  title: string;
  pieces: PieceId[];
  interactive: boolean;
  conflict: boolean;
  onPick: (piece: PieceId) => void;
}

function BankView({ side, title, pieces, interactive, conflict, onPick }: BankViewProps) {
  return (
    <section
      className="river__bank"
      aria-label={title}
      data-side={side}
      data-conflict={conflict ? 'true' : undefined}
    >
      <Heading level={2}>{title}</Heading>
      <ul className="river__pieces">
        {pieces.length === 0 && <li className="river__cargo-empty">Ninguém aqui</li>}
        {pieces.map((piece) => (
          <li key={piece}>
            {interactive ? (
              <Button variant="secondary" icon={PIECE_ICON[piece]} onClick={() => onPick(piece)}>
                {PIECE_LABEL[piece]} (peso {PIECE_WEIGHT[piece]})
              </Button>
            ) : (
              <span className="river__piece-static">
                <span aria-hidden="true">{PIECE_ICON[piece]}</span>
                {PIECE_LABEL[piece]} (peso {PIECE_WEIGHT[piece]})
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RulesView({ onStart }: { onStart: (round: RoundId) => void }) {
  return (
    <div className="river-rules" role="region" aria-label="Regras do jogo">
      <Heading level={1}>Travessia do Rio</Heading>
      <Text size="lg">
        Leve o Lobo, a Ovelha, a Alface, o Cachorro e a Galinha da margem E para a margem D sem quebrar nenhuma
        regra e sem esvaziar o tanque de combustível.
      </Text>

      <Heading level={2}>Como jogar</Heading>
      <ol className="river-rules__list">
        <li>
          <strong>O barco.</strong> Só o Fazendeiro conduz e ele nunca sai do barco. O barco aguenta peso total 3,
          e o Fazendeiro pesa 1. Sobra peso 2 para a carga: uma peça larga (peso 2: Lobo ou Ovelha), até duas
          peças pequenas (peso 1: Alface, Cachorro, Galinha) ou nenhuma carga.
        </li>
        <li>
          <strong>Travessia.</strong> Escolha a carga na margem onde o barco está e aperte Atravessar. A carga
          desembarca na margem de chegada.
        </li>
        <li>
          <strong>Verificação.</strong> Depois de cada travessia, olhamos a margem onde o barco <em>não</em> está.
          Se alguma regra abaixo se aplicar a ela, a travessia é desfeita. Na margem do barco não há conflito. As
          regras valem para qualquer par de peças da margem, mesmo com outras peças junto.
        </li>
        <li>
          <strong>Combustível.</strong> Cada travessia gasta uma gota, <em>inclusive as que forem desfeitas</em>.
          Se o tanque esvaziar antes de todos chegarem à margem D, a rodada recomeça.
        </li>
      </ol>

      <Heading level={2}>Regras de conflito</Heading>
      <ul className="river-rules__list">
        {CONFLICT_RULES.map((rule) => (
          <li key={rule.id}>
            <strong>{rule.id}.</strong> {rule.description}
          </li>
        ))}
      </ul>

      <Heading level={2}>Rodadas</Heading>
      <ul className="river-rules__list">
        <li>
          <strong>Rodada 1 (aquecimento):</strong> o Lobo fica fora do jogo e o tanque tem {ROUNDS[1].fuel} gotas.
        </li>
        <li>
          <strong>Rodada 2 (jogo completo):</strong> todos jogam e o tanque tem {ROUNDS[2].fuel} gotas.
        </li>
      </ul>

      <div className="river-page__actions">
        <Button variant="success" icon={<Play />} onClick={() => onStart(1)}>
          Começar rodada 1
        </Button>
        <Button variant="primary" icon={<Play />} onClick={() => onStart(2)}>
          Começar rodada 2
        </Button>
        <LinkButton to="/subjects" variant="secondary" icon={<ArrowLeft />}>
          Voltar
        </LinkButton>
      </div>
    </div>
  );
}

export default RiverCrossingPage;
