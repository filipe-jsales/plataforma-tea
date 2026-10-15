import { ArrowLeft, Check, CircleDot, FastForward, Play, RotateCcw, StepForward } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ScheduleTable } from '../../../components/minigame/scheduler/ScheduleTable';
import {
  Button,
  Heading,
  InlineFeedback,
  LinkButton,
  SegmentedControl,
  SelectableCard,
  Text,
  TextField,
  ToggleSwitch,
} from '../../../components/ui';
import {
  ANOMALY_DEFINITION,
  ANOMALY_LABEL,
  ANOMALY_REINFORCEMENT,
  CLASSIFICATION_ORDER,
} from '../../../lib/scheduler/anomalies';
import {
  buildRound,
  describeOp,
  formatDb,
  targetQuestion,
  type Classification,
  type Round,
} from '../../../lib/scheduler/engine';
import { buildSession, SESSION_LENGTHS, type SessionLength } from '../../../lib/scheduler/scenarios';
import { useSensoryProfileStore } from '../../../stores/useSensoryProfileStore';
import './SchedulerGamePage.css';

// Pausa entre uma operação e a próxima no modo automático (suspense da revelação).
export const REVEAL_MS = 1200;

export const POINTS_PER_ROUND = 3;

type Stage = 'predict' | 'reveal' | 'feedback';

interface RoundResult {
  classification: Classification;
  predictionOk: boolean;
  valueOk: boolean;
  classificationOk: boolean;
  points: number;
}

function parseInteger(text: string): number | null {
  const trimmed = text.trim();
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : null;
}

// Jogo público e sem backend (mesmo racional da Travessia do Rio): nenhuma
// pontuação sai do navegador e nada é comparado entre alunos. Progresso e
// pontos são só da sessão em tela.
export default function SchedulerGamePage({ standalone = false }: { standalone?: boolean }) {
  const motionEnabled = useSensoryProfileStore((state) => state.motionEnabled);

  const [length, setLength] = useState<SessionLength>(8);
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);

  const [stage, setStage] = useState<Stage>('predict');
  const [predictionText, setPredictionText] = useState('');
  const [prediction, setPrediction] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(0);
  // Revelação automática é opt-in: nasce do perfil sensorial (desligado por padrão).
  const [auto, setAuto] = useState(motionEnabled);
  const [valueText, setValueText] = useState('');
  const [choice, setChoice] = useState<Classification | null>(null);

  const round = rounds?.[roundIndex] ?? null;
  const total = round?.steps.length ?? 0;
  const allRevealed = revealed >= total;

  useEffect(() => {
    if (!round || stage !== 'reveal' || !auto || allRevealed) return;
    const timer = setTimeout(() => setRevealed((n) => n + 1), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [round, stage, auto, allRevealed, revealed]);

  function startRound(index: number) {
    setRoundIndex(index);
    setStage('predict');
    setPredictionText('');
    setPrediction(null);
    setRevealed(0);
    setValueText('');
    setChoice(null);
  }

  function start() {
    setRounds(buildSession(length).map(buildRound));
    setResults([]);
    startRound(0);
  }

  function confirmPrediction() {
    const value = parseInteger(predictionText);
    if (value === null) return;
    setPrediction(value);
    setStage('reveal');
    setRevealed(1);
  }

  function confirmAnswer() {
    if (!round || choice === null) return;
    const value = parseInteger(valueText);
    if (value === null) return;
    const predictionOk = prediction === round.serialValue;
    const valueOk = value === round.realValue;
    const classificationOk = choice === round.analysis.classification;
    setResults((previous) => [
      ...previous,
      {
        classification: round.analysis.classification,
        predictionOk,
        valueOk,
        classificationOk,
        points: Number(predictionOk) + Number(valueOk) + Number(classificationOk),
      },
    ]);
    setStage('feedback');
  }

  const header = (
    <header className="scheduler-game__header">
      {!standalone && (
        <LinkButton to="/subjects" variant="secondary" icon={<ArrowLeft />}>
          Voltar
        </LinkButton>
      )}
      <div>
        <p className="scheduler-game__eyebrow">Banco de Dados II · Unidade III</p>
        <Heading level={1}>Detetive do Escalonador</Heading>
      </div>
    </header>
  );

  if (!rounds || !round) {
    return (
      <main className="scheduler-game staff-theme" data-animated="false">
        {header}
        <section className="scheduler-game__panel" aria-label="Como funciona">
          <Heading level={2}>Como funciona</Heading>
          <Text>
            Em cada rodada você vê transações que acessam os mesmos itens de dados. Primeiro você prevê o resultado
            se elas executassem uma após a outra. Depois o escalonamento intercalado é revelado operação por
            operação, e você informa o valor real e classifica o cenário.
          </Text>
          <ol className="scheduler-game__steps">
            <li>Preveja o valor final da execução serial.</li>
            <li>Acompanhe o escalonamento intercalado, linha a linha.</li>
            <li>Informe o valor real e escolha: perda de atualização, leitura suja, agregação incorreta ou nenhuma anomalia.</li>
          </ol>
          <Text tone="muted">
            Vale 1 ponto cada acerto (previsão, valor real e classificação), até {POINTS_PER_ROUND} por rodada. Alguns
            cenários estão corretos: nem todo escalonamento intercalado tem problema. Não há tempo limite.
          </Text>
          <div className="scheduler-game__start">
            <SegmentedControl
              ariaLabel="Número de rodadas"
              value={String(length)}
              onValueChange={(value) => setLength(Number(value) as SessionLength)}
              options={SESSION_LENGTHS.map((n) => ({ value: String(n), label: `${n} rodadas` }))}
            />
            <Button variant="success" icon={<Play />} onClick={start}>
              Começar
            </Button>
          </div>
        </section>
      </main>
    );
  }

  const finished = stage === 'feedback' && roundIndex === rounds.length - 1;
  const result = results[roundIndex];

  return (
    <main className="scheduler-game staff-theme" data-animated={auto ? 'true' : 'false'}>
      {header}

      <section className="scheduler-game__status" aria-label="Situação da sessão">
        <Text>
          <strong>
            Rodada {roundIndex + 1} de {rounds.length}
          </strong>
        </Text>
        <Text>
          Pontos: <strong>{results.reduce((sum, r) => sum + r.points, 0)}</strong>
        </Text>
      </section>

      {stage === 'predict' && (
        <section className="scheduler-game__panel" aria-label="Previsão">
          <Heading level={2}>Primeiro, a previsão</Heading>
          <Text>
            Valores iniciais: <strong>{formatDb(round.scenario.initial)}</strong>
          </Text>
          <div className="scheduler-game__transactions">
            {round.transactions.map((tx) => (
              <div key={tx} className="scheduler-game__transaction">
                <Heading level={3}>{tx}</Heading>
                <ol>
                  {round.scenario.ops
                    .filter((op) => op.tx === tx)
                    .map((op, i) => (
                      <li key={i}>
                        <code>{describeOp(op)}</code>
                      </li>
                    ))}
                </ol>
              </div>
            ))}
          </div>
          <form
            className="scheduler-game__form"
            onSubmit={(event) => {
              event.preventDefault();
              confirmPrediction();
            }}
          >
            <TextField
              id="scheduler-prediction"
              label={targetQuestion(round.scenario.target, true)}
              inputMode="numeric"
              value={predictionText}
              onChange={(event) => setPredictionText(event.target.value)}
            />
            <Button type="submit" variant="success" icon={<Check />} disabled={parseInteger(predictionText) === null}>
              Confirmar previsão
            </Button>
          </form>
        </section>
      )}

      {stage !== 'predict' && (
        <section className="scheduler-game__panel" aria-label="Escalonamento">
          <div className="scheduler-game__panel-head">
            <Heading level={2}>Escalonamento intercalado</Heading>
            <Text tone="muted">
              Valores iniciais: {formatDb(round.scenario.initial)}
              {prediction !== null && ` · Sua previsão serial: ${prediction}`}
            </Text>
          </div>

          <ScheduleTable round={round} revealed={revealed} showCulprits={stage === 'feedback'} />

          {stage === 'reveal' && !allRevealed && (
            <div className="scheduler-game__controls">
              <Button variant="secondary" icon={<StepForward />} onClick={() => setRevealed((n) => n + 1)}>
                Próxima operação
              </Button>
              <Button variant="secondary" icon={<FastForward />} onClick={() => setRevealed(total)}>
                Mostrar tudo
              </Button>
              <ToggleSwitch
                id="scheduler-auto"
                label="Revelar automaticamente"
                checked={auto}
                onCheckedChange={setAuto}
              />
            </div>
          )}
        </section>
      )}

      {stage === 'reveal' && allRevealed && (
        <section className="scheduler-game__panel" aria-label="Sua resposta">
          <Heading level={2}>Agora, o veredito</Heading>
          <form
            className="scheduler-game__form"
            onSubmit={(event) => {
              event.preventDefault();
              confirmAnswer();
            }}
          >
            <TextField
              id="scheduler-value"
              label={targetQuestion(round.scenario.target, false)}
              inputMode="numeric"
              value={valueText}
              onChange={(event) => setValueText(event.target.value)}
            />
            <fieldset className="scheduler-game__choices">
              <legend>Como você classifica este cenário?</legend>
              {CLASSIFICATION_ORDER.map((option) => (
                <SelectableCard
                  key={option}
                  align="start"
                  icon={<CircleDot />}
                  selected={choice === option}
                  onSelect={() => setChoice(option)}
                >
                  {ANOMALY_LABEL[option]}
                </SelectableCard>
              ))}
            </fieldset>
            <Button
              type="submit"
              variant="success"
              icon={<Check />}
              disabled={choice === null || parseInteger(valueText) === null}
            >
              Confirmar resposta
            </Button>
          </form>
        </section>
      )}

      {stage === 'feedback' && result && (
        <section className="scheduler-game__panel scheduler-game__feedback" aria-label="Resultado da rodada">
          <InlineFeedback kind={result.points === POINTS_PER_ROUND ? 'success' : 'retry'}>
            {result.points === POINTS_PER_ROUND
              ? `Rodada completa: ${result.points} de ${POINTS_PER_ROUND} pontos.`
              : `Quase lá: você somou ${result.points} de ${POINTS_PER_ROUND} pontos nesta rodada.`}
          </InlineFeedback>

          <ul className="scheduler-game__breakdown">
            <li>
              <strong>Previsão serial:</strong> {result.predictionOk ? 'bateu' : 'não bateu'} (você previu{' '}
              {prediction}; o valor serial era {round.serialValue}).
            </li>
            <li>
              <strong>Valor real:</strong> {result.valueOk ? 'bateu' : 'não bateu'} (você respondeu{' '}
              {parseInteger(valueText)}; o valor real foi {round.realValue}).
            </li>
            <li>
              <strong>Classificação:</strong>{' '}
              {result.classificationOk
                ? `você acertou: ${ANOMALY_LABEL[round.analysis.classification]}.`
                : `você escolheu "${choice ? ANOMALY_LABEL[choice] : ''}"; a classificação correta é "${ANOMALY_LABEL[round.analysis.classification]}".`}
            </li>
          </ul>

          <div className="scheduler-game__definition">
            {result.classificationOk && <Text>{ANOMALY_REINFORCEMENT[round.analysis.classification]}</Text>}
            <Heading level={3}>{ANOMALY_LABEL[round.analysis.classification]}</Heading>
            <Text>{ANOMALY_DEFINITION[round.analysis.classification]}</Text>
            {round.analysis.culprits.length > 0 && (
              <Text tone="muted">As operações que causaram o problema estão marcadas como Causa na tabela acima.</Text>
            )}
          </div>

          {!finished && (
            <Button variant="success" icon={<StepForward />} onClick={() => startRound(roundIndex + 1)}>
              Próxima rodada
            </Button>
          )}
        </section>
      )}

      {finished && <Summary results={results} onRestart={() => setRounds(null)} />}
    </main>
  );
}

function Summary({ results, onRestart }: { results: RoundResult[]; onRestart: () => void }) {
  const points = results.reduce((sum, r) => sum + r.points, 0);
  return (
    <section className="scheduler-game__panel" aria-label="Resumo da sessão">
      <Heading level={2}>Resumo da sessão</Heading>
      <Text>
        Você somou <strong>{points}</strong> de {results.length * POINTS_PER_ROUND} pontos.
      </Text>
      <ul className="scheduler-game__breakdown">
        {CLASSIFICATION_ORDER.map((kind) => {
          const ofKind = results.filter((r) => r.classification === kind);
          if (ofKind.length === 0) return null;
          return (
            <li key={kind}>
              <strong>{ANOMALY_LABEL[kind]}:</strong> {ofKind.filter((r) => r.classificationOk).length} de{' '}
              {ofKind.length} classificações certas
            </li>
          );
        })}
      </ul>
      <Button variant="secondary" icon={<RotateCcw />} onClick={onRestart}>
        Jogar de novo
      </Button>
    </section>
  );
}
