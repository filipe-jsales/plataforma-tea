import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  BookOpen,
  Droplet,
  Fuel,
  Lightbulb,
  Play,
  RotateCcw,
  TriangleAlert,
  Undo2,
  Volume2,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RIVER_ICON_LABEL, RiverPieceIcon } from '../../../components/minigame/RiverPieceIcon';
import { Button, Heading, InlineFeedback, LinkButton, Text, ToggleSwitch, Tooltip } from '../../../components/ui';
import {
  BOAT_CARGO_CAPACITY,
  CONFLICT_RULES,
  ROUNDS,
  PIECE_LABEL,
  PIECE_WEIGHT,
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
import {
  logRiverAbandoned,
  logRiverCargoChanged,
  logRiverCargoRejected,
  logRiverCrossingAttempted,
  logRiverFuelDepleted,
  logRiverHintRequested,
  logRiverRestarted,
  logRiverRoundCompleted,
  logRiverRoundStarted,
  logRiverRulesResumed,
  logRiverRulesViewed,
  logRiverSoundToggled,
  type RoundStartReason,
} from '../../../lib/riverEvents';
import { RIVER_HINTS } from '../../../lib/riverHints';
import { playRiverSound, type RiverSound } from '../../../lib/riverSounds';
import { useAuthStore } from '../../../stores/useAuthStore';
import './RiverCrossingPage.css';

// Duração do barco atravessando (casa com a transição de `left` no CSS) e
// tempo que o conflito fica visível antes de a travessia ser desfeita.
export const CROSSING_MS = 700;
export const CONFLICT_MS = 1500;

export interface RiverCrossingTiming {
  crossingMs: number;
  conflictMs: number;
}

const DEFAULT_TIMING: RiverCrossingTiming = { crossingMs: CROSSING_MS, conflictMs: CONFLICT_MS };

type Phase = 'rules' | 'play';
type Result = 'won' | 'lost' | null;
type Feedback = { kind: 'info' | 'retry' | 'success'; text: string } | null;

function conflictText(conflicts: ConflictRule[]): string {
  return conflicts.map((rule) => `${rule.id}: ${rule.description}`).join(' ');
}

export function RiverCrossingPage({ timing = DEFAULT_TIMING }: { timing?: RiverCrossingTiming }) {
  const [phase, setPhase] = useState<Phase>('rules');
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<RiverState>(() => createInitialState(2));
  const [cargo, setCargo] = useState<PieceId[]>([]);
  const [boatSide, setBoatSide] = useState<Bank>('E');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [conflictBank, setConflictBank] = useState<Bank | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [revealedHints, setRevealedHints] = useState<Record<RoundId, number[]>>({ 1: [], 2: [] });
  const timers = useRef<number[]>([]);

  const studentId = useAuthStore((store) => store.user?.pseudonymId ?? null);
  // Contadores só para os eventos; nunca mudam o que a tela mostra.
  const stats = useRef({
    attempts: 0,
    invalid: 0,
    roundStartedAt: 0,
    lastActionAt: 0,
    rulesOpenedAt: 0,
    roundAttempt: { 1: 0, 2: 0 } as Record<RoundId, number>,
  });
  const live = useRef({ started: false, finished: false, round: 2 as RoundId, fuel: 0, hints: 0 });
  live.current = {
    started,
    finished: result !== null,
    round: state.round,
    fuel: state.fuel,
    hints: revealedHints[state.round].length,
  };

  const touch = () => {
    const now = Date.now();
    const since = stats.current.lastActionAt ? now - stats.current.lastActionAt : 0;
    stats.current.lastActionAt = now;
    return since;
  };

  useEffect(() => {
    logRiverRulesViewed(studentId, { origin: 'before_start', round: 2 });
    return () => {
      const snapshot = live.current;
      if (!snapshot.started || snapshot.finished) return;
      logRiverAbandoned(studentId, {
        round: snapshot.round,
        crossings: stats.current.attempts,
        fuelLeft: snapshot.fuel,
        hintsUsed: snapshot.hints,
        timeInRoundMs: Date.now() - stats.current.roundStartedAt,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const sound = (name: RiverSound) => {
    if (soundOn) playRiverSound(name);
  };

  const restart = (round: RoundId, reason: RoundStartReason) => {
    if (reason !== 'first_start' && reason !== 'next_round') {
      logRiverRestarted(studentId, {
        round: state.round,
        reason,
        crossingsInAttempt: stats.current.attempts,
        fuelLeft: state.fuel,
      });
    }
    stats.current.roundAttempt[round] += 1;
    logRiverRoundStarted(studentId, { round, reason, roundAttempt: stats.current.roundAttempt[round] });
    stats.current.attempts = 0;
    stats.current.invalid = 0;
    stats.current.roundStartedAt = Date.now();
    stats.current.lastActionAt = Date.now();
    clearTimers();
    setState(createInitialState(round));
    setBoatSide('E');
    setCargo([]);
    setBusy(false);
    setResult(null);
    setConflictBank(null);
    setFeedback(null);
    setStarted(true);
    setPhase('play');
  };

  const toggleOnBoat = (piece: PieceId) => {
    if (busy || result) return;
    touch();
    if (cargo.includes(piece)) {
      logRiverCargoChanged(studentId, {
        round: state.round,
        action: 'unload',
        piece,
        cargo: cargo.filter((p) => p !== piece),
      });
      sound('drop');
      setCargo(cargo.filter((p) => p !== piece));
      setFeedback(null);
      return;
    }
    if (!canAddToCargo(cargo, piece)) {
      logRiverCargoRejected(studentId, { round: state.round, piece, cargo });
      setFeedback({
        kind: 'info',
        text: `O barco leva o Fazendeiro e carga de até peso ${BOAT_CARGO_CAPACITY}. Tire alguém do barco para colocar ${PIECE_LABEL[piece]}.`,
      });
      return;
    }
    logRiverCargoChanged(studentId, {
      round: state.round,
      action: 'load',
      piece,
      cargo: [...cargo, piece],
    });
    sound('pick');
    setCargo([...cargo, piece]);
    setFeedback(null);
  };

  const handleCross = () => {
    if (busy || result) return;
    const outcome = cross(state, cargo);
    const origin = state.boat;
    const invalid = outcome.conflicts.length > 0;
    stats.current.attempts += 1;
    if (invalid) stats.current.invalid += 1;
    const sincePrevious = touch();
    const hintsUsed = revealedHints[state.round].length;
    const durationMs = Date.now() - stats.current.roundStartedAt;
    logRiverCrossingAttempted(studentId, {
      round: state.round,
      from: origin,
      to: outcome.arrived.boat,
      cargo,
      outcome: outcome.outcome,
      rulesViolated: outcome.conflicts.map((rule) => rule.id),
      fuelAfter: outcome.settled.fuel,
      crossingNumber: stats.current.attempts,
      invalidSoFar: stats.current.invalid,
      msSincePreviousAction: sincePrevious,
    });
    if (outcome.outcome === 'won') {
      logRiverRoundCompleted(studentId, {
        round: state.round,
        crossings: stats.current.attempts,
        invalidAttempts: stats.current.invalid,
        fuelLeft: outcome.settled.fuel,
        hintsUsed,
        durationMs,
      });
    } else if (outcome.outcome === 'lost') {
      logRiverFuelDepleted(studentId, {
        round: state.round,
        crossings: stats.current.attempts,
        invalidAttempts: stats.current.invalid,
        hintsUsed,
        durationMs,
      });
    }
    setBusy(true);
    setFeedback(null);
    setBoatSide(outcome.arrived.boat);
    sound('cross');

    later(() => {
      setState(outcome.arrived);
      setCargo([]);

      if (outcome.conflicts.length > 0) {
        sound('conflict');
        setConflictBank(origin);
        setFeedback({
          kind: 'retry',
          text: `Conflito na margem ${origin === 'E' ? 'esquerda' : 'direita'}. ${conflictText(outcome.conflicts)} A travessia será desfeita, mas a gota continua gasta.`,
        });
        later(() => {
          setConflictBank(null);
          setState(outcome.settled);
          setBoatSide(outcome.settled.boat);
          setBusy(false);
          if (outcome.outcome === 'lost') {
            sound('lose');
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
        sound('win');
        setResult('won');
      } else if (outcome.outcome === 'lost') {
        sound('lose');
        setResult('lost');
      }
    }, timing.crossingMs);
  };

  const openRules = () => {
    touch();
    stats.current.rulesOpenedAt = Date.now();
    logRiverRulesViewed(studentId, { origin: 'during_round', round: state.round });
    setPhase('rules');
  };

  const resume = () => {
    logRiverRulesResumed(studentId, {
      round: state.round,
      viewDurationMs: Date.now() - stats.current.rulesOpenedAt,
    });
    setPhase('play');
  };

  const revealHint = (hintNumber: number) => {
    const round = state.round;
    const already = revealedHints[round];
    if (already.includes(hintNumber)) return;
    const hint = RIVER_HINTS[round].find((h) => h.number === hintNumber);
    if (!hint) return;
    const expectedNext = RIVER_HINTS[round].find((h) => !already.includes(h.number))?.number;
    touch();
    logRiverHintRequested(studentId, {
      round,
      hintNumber,
      discountPoints: hint.discountPoints,
      hintsUsedAfter: already.length + 1,
      crossingsSoFar: stats.current.attempts,
      outOfOrder: hintNumber !== expectedNext,
    });
    setRevealedHints({ ...revealedHints, [round]: [...already, hintNumber] });
  };

  if (phase === 'rules') {
    return (
      <main className="river-page staff-theme">
        <RulesView
          started={started}
          onStart={(round) => restart(round, started ? 'manual_restart' : 'first_start')}
          onContinue={resume}
        />
      </main>
    );
  }

  const canCross = !busy && !result;

  return (
    <main className="river-page staff-theme" data-result={result ?? undefined}>
      <header className="river-page__header">
        <LinkButton to="/subjects" variant="secondary" icon={<ArrowLeft />}>
          Voltar
        </LinkButton>
        <Heading level={1}>Travessia do Rio</Heading>
        <Button variant="secondary" icon={<BookOpen />} onClick={openRules} disabled={busy}>
          Ver regras
        </Button>
      </header>

      <section className="river-page__status" aria-label="Situação da partida">
        <Text>
          <strong>{state.round === 1 ? 'Rodada 1: sem o Lobo' : 'Rodada 2: jogo completo'}</strong>
        </Text>
        <FuelTank fuel={state.fuel} total={ROUNDS[state.round].fuel} />
        <ToggleSwitch
          id="river-sound"
          icon={<Volume2 />}
          label="Som"
          checked={soundOn}
          onCheckedChange={(enabled) => {
            logRiverSoundToggled(studentId, { enabled });
            setSoundOn(enabled);
          }}
        />
      </section>

      <div className="river" data-testid="river">
        <BankView
          side="E"
          title="Margem Esquerda"
          pieces={piecesOnBank(state, 'E').filter((p) => !cargo.includes(p))}
          interactive={boatSide === 'E' && canCross}
          conflict={conflictBank === 'E'}
          onPick={toggleOnBoat}
        />

        <div className="river__water">
          <div className="river__boat" data-side={boatSide} data-testid="boat">
            <div className="river__crew">
              <span
                className="river-piece river-piece--static"
                role="img"
                aria-label={`${RIVER_ICON_LABEL.farmer}, peso 1`}
              >
                <RiverPieceIcon id="farmer" size={44} />
                <span className="river-piece__badge" aria-hidden="true">
                  1
                </span>
              </span>
              <ul className="river__cargo" aria-label="Carga no barco">
                {cargo.map((piece) => (
                  <li key={piece}>
                    <PieceButton
                      piece={piece}
                      label={`Tirar ${PIECE_LABEL[piece]} do barco`}
                      onClick={() => toggleOnBoat(piece)}
                      disabled={!canCross}
                    />
                  </li>
                ))}
              </ul>
            </div>
            <span className="river__hull" aria-hidden="true" />
          </div>
        </div>

        <BankView
          side="D"
          title="Margem Direita"
          pieces={piecesOnBank(state, 'D').filter((p) => !cargo.includes(p))}
          interactive={boatSide === 'D' && canCross}
          conflict={conflictBank === 'D'}
          onPick={toggleOnBoat}
        />
      </div>

      <div className="river-page__actions river-page__actions--controls">
        <ControlButton
          label="Atravessar para a margem esquerda"
          hint={
            boatSide === 'E'
              ? 'O barco já está na margem esquerda'
              : 'Leva o barco com a carga escolhida para a margem esquerda'
          }
          icon={<ChevronLeft />}
          variant="primary"
          disabled={!canCross || boatSide === 'E'}
          onClick={handleCross}
        />
        <ControlButton
          label="Recomeçar"
          hint="Volta a rodada ao começo: personagens na margem esquerda e tanque cheio"
          icon={<RotateCcw />}
          variant="secondary"
          disabled={busy}
          onClick={() => restart(state.round, 'manual_restart')}
        />
        <ControlButton
          label="Atravessar para a margem direita"
          hint={
            boatSide === 'D'
              ? 'O barco já está na margem direita'
              : 'Leva o barco com a carga escolhida para a margem direita'
          }
          icon={<ChevronRight />}
          variant="primary"
          disabled={!canCross || boatSide === 'D'}
          onClick={handleCross}
        />
      </div>

      <div aria-live="polite" className="river-page__feedback">
        {feedback && (
          <InlineFeedback kind={feedback.kind} icon={feedback.kind === 'retry' ? <TriangleAlert /> : undefined}>
            {feedback.text}
          </InlineFeedback>
        )}
      </div>

      <HintCards
        key={state.round}
        hints={RIVER_HINTS[state.round]}
        revealed={revealedHints[state.round]}
        onReveal={revealHint}
      />

      {result === 'won' && (
        <section className="river-page__result river-page__result--won" role="status">
          <Heading level={2}>Todos chegaram à margem direita</Heading>
          <Text>
            Você atravessou em {ROUNDS[state.round].fuel - state.fuel} viagens, sobrando {state.fuel}{' '}
            {state.fuel === 1 ? 'gota' : 'gotas'} de combustível.
          </Text>
          <div className="river-page__actions">
            <Button variant="success" icon={<Play />} onClick={() => restart(state.round, 'after_win')}>
              Jogar de novo
            </Button>
            {state.round === 1 && (
              <Button variant="primary" icon={<ArrowRight />} onClick={() => restart(2, 'next_round')}>
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
            <Button variant="primary" icon={<Undo2 />} onClick={() => restart(state.round, 'after_out_of_fuel')}>
              Tentar de novo
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}

// Botão só com ícone (pedido explícito): o nome acessível vem do aria-label e a
// dica visual do Tooltip. O <span> recebe o hover mesmo com o botão bloqueado.
function ControlButton({
  label,
  hint,
  icon,
  variant,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  icon: ReactNode;
  variant: 'primary' | 'secondary';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip content={hint}>
      <span className="river-control">
        <Button variant={variant} icon={icon} aria-label={label} disabled={disabled} onClick={onClick} />
      </span>
    </Tooltip>
  );
}

function HintCards({
  hints,
  revealed,
  onReveal,
}: {
  hints: Array<{ number: number; text: string }>;
  revealed: number[];
  onReveal: (hintNumber: number) => void;
}) {
  return (
    <section className="hint-cards" aria-label="Dicas">
      <Heading level={2}>Dicas</Heading>
      <Text tone="muted">Vire uma carta se quiser ajuda. Ela fica aberta para você reler.</Text>
      <ul className="hint-cards__grid">
        {hints.map((hint) => {
          const open = revealed.includes(hint.number);
          return (
            <li key={hint.number} className="hint-cards__item">
              {open ? (
                <article className="hint-card hint-card--front" aria-label={`Dica ${hint.number}`}>
                  <span className="hint-card__number" aria-hidden="true">
                    {hint.number}
                  </span>
                  <p className="hint-card__text">{hint.text}</p>
                </article>
              ) : (
                <Button
                  variant="secondary"
                  className="hint-card hint-card--back"
                  icon={<Lightbulb />}
                  aria-label={`Virar dica ${hint.number}`}
                  onClick={() => onReveal(hint.number)}
                >
                  <span className="hint-card__number" aria-hidden="true">
                    {hint.number}
                  </span>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PieceButton({
  piece,
  label,
  onClick,
  disabled,
}: {
  piece: PieceId;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="secondary"
      className="river-piece river-piece--button"
      aria-label={`${label}, peso ${PIECE_WEIGHT[piece]}`}
      onClick={onClick}
      disabled={disabled}
    >
      <RiverPieceIcon id={piece} />
      <span className="river-piece__badge" aria-hidden="true">
        {PIECE_WEIGHT[piece]}
      </span>
    </Button>
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
      <span aria-hidden="true">
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
        {pieces.map((piece) => (
          <li key={piece}>
            {interactive ? (
              <PieceButton piece={piece} label={PIECE_LABEL[piece]} onClick={() => onPick(piece)} />
            ) : (
              <span
                className="river-piece river-piece--static"
                role="img"
                aria-label={`${PIECE_LABEL[piece]}, peso ${PIECE_WEIGHT[piece]}`}
              >
                <RiverPieceIcon id={piece} />
                <span className="river-piece__badge" aria-hidden="true">
                  {PIECE_WEIGHT[piece]}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RulesView({
  started,
  onStart,
  onContinue,
}: {
  started: boolean;
  onStart: (round: RoundId) => void;
  onContinue: () => void;
}) {
  return (
    <div className="river-rules" role="region" aria-label="Regras do jogo">
      <Heading level={1}>Travessia do Rio</Heading>
      <Text size="lg">
        Leve o Lobo, a Ovelha, a Alface, o Cachorro e a Galinha da margem esquerda para a margem direita sem quebrar nenhuma
        regra e sem esvaziar o tanque de combustível.
      </Text>

      <Heading level={2}>Como jogar</Heading>
      <ol className="river-rules__list">
        <li>
          <strong>O barco.</strong> Só o Fazendeiro conduz e ele nunca sai do barco. O barco aguenta peso total 3,
          e o Fazendeiro pesa 1. Sobra peso 2 para a carga: uma peça larga (peso 2: Lobo ou Ovelha), até duas
          peças pequenas (peso 1: Alface, Cachorro, Galinha) ou nenhuma carga. O número no canto de cada
          personagem é o peso dele.
        </li>
        <li>
          <strong>Travessia.</strong> Escolha a carga na margem onde o barco está e aperte Atravessar. A carga
          desembarca na margem de chegada.
        </li>
        <li>
          <strong>Verificação.</strong> Depois de cada travessia, olhamos a margem onde o barco <em>não</em> está.
          Se alguma regra abaixo se aplicar a ela, a travessia é desfeita. Na margem do barco não há conflito. As
          regras valem para qualquer par de personagens da margem, mesmo com outros junto.
        </li>
        <li>
          <strong>Combustível.</strong> Cada travessia gasta uma gota,{' '}
          <em>inclusive as que forem desfeitas</em>. Se o tanque esvaziar antes de todos chegarem à margem direita, a
          partida recomeça.
        </li>
      </ol>

      <Heading level={2}>Rodadas</Heading>
      <ul className="river-rules__list">
        <li>
          <strong>Rodada 1:</strong> o Lobo fica fora do jogo e o tanque tem {ROUNDS[1].fuel} gotas. Serve para
          conhecer os personagens e a verificação.
        </li>
        <li>
          <strong>Rodada 2:</strong> todos os personagens jogam e o tanque tem {ROUNDS[2].fuel} gotas.
        </li>
      </ul>

      <Heading level={2}>Regras de conflito</Heading>
      <ul className="river-rules__list">
        {CONFLICT_RULES.map((rule) => (
          <li key={rule.id}>
            <strong>{rule.id}.</strong> {rule.description}
          </li>
        ))}
      </ul>

      <div className="river-page__actions">
        {started && (
          <Button variant="success" icon={<Play />} onClick={onContinue}>
            Continuar a travessia
          </Button>
        )}
        <Button variant={started ? 'secondary' : 'success'} icon={<Play />} onClick={() => onStart(1)}>
          {started ? 'Recomeçar na rodada 1' : 'Começar rodada 1'}
        </Button>
        <Button variant={started ? 'secondary' : 'primary'} icon={<Play />} onClick={() => onStart(2)}>
          {started ? 'Recomeçar na rodada 2' : 'Começar rodada 2'}
        </Button>
        <LinkButton to="/subjects" variant="secondary" icon={<ArrowLeft />}>
          Voltar
        </LinkButton>
      </div>
    </div>
  );
}

export default RiverCrossingPage;
