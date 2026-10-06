import { useEffect, useState } from "react";
import { apiClient, ApiError } from "../../lib/apiClient";
import type {
  FractionsFactoryFraction,
  MiniGameLevelDto,
} from "../../lib/miniGameLevelTypes";
import {
  Badge,
  Button,
  InlineFeedback,
  LinkButton,
  Select,
  TextField,
} from "../../components/ui";
import { CONTENT_CATEGORY_LABEL } from "../../lib/contentCategory";
import "./TeacherMiniGameSettings.css";
import { Plus, Trash } from "lucide-react";

const CONCEPT_ID = "fractions_equal_parts";

const THEME_OPTIONS = [
  { value: "chocolate_bar", label: "Barra de chocolate" },
  { value: "pizza", label: "Pizza" },
  { value: "garden", label: "Jardim" },
];

const STAGE_LABEL: Record<string, string> = {
  use: "Nível 1 - Use",
  modify: "Nível 2 - Modify",
  create: "Nível 3 - Create",
};

interface LevelDraft {
  theme: string;
  numerator: string;
  denominator: string;
  fractionPool: FractionsFactoryFraction[];
}

function draftFromLevel(level: MiniGameLevelDto): LevelDraft {
  return {
    theme: level.config.theme,
    numerator: String(level.config.targetFraction.numerator),
    denominator: String(level.config.targetFraction.denominator),
    fractionPool: level.config.fractionPool ?? [],
  };
}

// Painel do professor pro jogo "Fábrica de Pedaços Iguais" (pedido
// explícito do produto: "professor possa configurar"). Mesmo padrão de
// fetch/save de AdminSettings.tsx, mas com TextField/Select de verdade em
// vez de <input> cru - operável sem formação técnica (regra
// não-negociável 9): tema por nome, fração por dois campos numéricos
// simples, nunca "edite o JSON de config".
export function TeacherMiniGameSettings() {
  const [levels, setLevels] = useState<MiniGameLevelDto[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, LevelDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Record<string, { kind: "success" | "retry"; text: string }>
  >({});

  useEffect(() => {
    apiClient
      .get<MiniGameLevelDto[]>(
        `/teacher/minigames/levels?conceptId=${CONCEPT_ID}`,
      )
      .then((result) => {
        setLevels(result);
        setDrafts(
          Object.fromEntries(
            result.map((level) => [level.id, draftFromLevel(level)]),
          ),
        );
      });
  }, []);

  function updateDraft(levelId: string, patch: Partial<LevelDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [levelId]: { ...prev[levelId], ...patch },
    }));
  }

  function addPoolFraction(levelId: string) {
    const draft = drafts[levelId];
    if (!draft || draft.fractionPool.length >= 5) return;
    updateDraft(levelId, {
      fractionPool: [...draft.fractionPool, { numerator: 1, denominator: 2 }],
    });
  }

  function removePoolFraction(levelId: string, index: number) {
    const draft = drafts[levelId];
    if (!draft) return;
    updateDraft(levelId, {
      fractionPool: draft.fractionPool.filter((_, i) => i !== index),
    });
  }

  async function handleSave(level: MiniGameLevelDto) {
    const draft = drafts[level.id];
    if (!draft) return;
    setSavingId(level.id);
    setMessages((prev) => ({ ...prev, [level.id]: undefined as never }));
    try {
      const body: Record<string, unknown> = {
        theme: draft.theme,
        targetFraction: {
          numerator: Number(draft.numerator),
          denominator: Number(draft.denominator),
        },
      };
      if (level.stage === "create") {
        body.fractionPool = draft.fractionPool;
      }
      const updated = await apiClient.patch<MiniGameLevelDto>(
        `/teacher/minigames/levels/${level.id}`,
        body,
      );
      setLevels(
        (prev) => prev?.map((l) => (l.id === level.id ? updated : l)) ?? null,
      );
      setMessages((prev) => ({
        ...prev,
        [level.id]: { kind: "success", text: "Configuração salva." },
      }));
    } catch (error) {
      const text =
        error instanceof ApiError
          ? error.message
          : "Não foi possível salvar - tente novamente.";
      setMessages((prev) => ({ ...prev, [level.id]: { kind: "retry", text } }));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="teacher-minigame-settings staff-theme page">
      <LinkButton to="/home" variant="ghost" icon="←">
        Voltar
      </LinkButton>
      <h1>Fábrica de Pedaços Iguais</h1>
      {/* CC1 - categoria só leitura (curada via seed/MiniGameLevel.category,
          nunca escolhida pelo professor aqui); as 3 linhas do jogo
          compartilham a mesma categoria, então a 1ª já basta. */}
      {levels && levels.length > 0 && (
        <Badge variant="neutral">
          {CONTENT_CATEGORY_LABEL[levels[0].category]}
        </Badge>
      )}
      <p>
        Escolha o tema e a fração-alvo de cada nível. No nível 3 (Create), "Novo
        pedido" sorteia uma fração desta lista a cada rodada.
      </p>

      {levels === null && <p>Carregando…</p>}

      {levels?.map((level) => {
        const draft = drafts[level.id];
        if (!draft) return null;
        const message = messages[level.id];
        return (
          <section key={level.id} className="teacher-minigame-settings__level">
            <h2>{STAGE_LABEL[level.stage] ?? level.title}</h2>
            <p>{level.title}</p>

            <div className="teacher-minigame-settings__row">
              <Select
                id={`theme-${level.id}`}
                label="Tema"
                value={draft.theme}
                options={THEME_OPTIONS}
                onValueChange={(value) =>
                  updateDraft(level.id, { theme: value })
                }
              />
              <TextField
                id={`numerator-${level.id}`}
                label="Numerador"
                type="number"
                min={1}
                value={draft.numerator}
                onChange={(event) =>
                  updateDraft(level.id, { numerator: event.target.value })
                }
              />
              <TextField
                id={`denominator-${level.id}`}
                label="Denominador"
                type="number"
                min={2}
                max={8}
                value={draft.denominator}
                onChange={(event) =>
                  updateDraft(level.id, { denominator: event.target.value })
                }
              />
            </div>

            {level.stage === "create" && (
              <div className="teacher-minigame-settings__pool">
                <p>Frações sorteadas em "Novo pedido" (1 a 5 opções):</p>
                <ul>
                  {draft.fractionPool.map((fraction, index) => (
                    <li key={index}>
                      <TextField
                        id={`pool-${level.id}-${index}-num`}
                        label="Numerador"
                        type="number"
                        min={1}
                        value={String(fraction.numerator)}
                        onChange={(event) => {
                          const next = [...draft.fractionPool];
                          next[index] = {
                            ...next[index],
                            numerator: Number(event.target.value),
                          };
                          updateDraft(level.id, { fractionPool: next });
                        }}
                      />
                      <TextField
                        id={`pool-${level.id}-${index}-den`}
                        label="Denominador"
                        type="number"
                        min={2}
                        max={8}
                        value={String(fraction.denominator)}
                        onChange={(event) => {
                          const next = [...draft.fractionPool];
                          next[index] = {
                            ...next[index],
                            denominator: Number(event.target.value),
                          };
                          updateDraft(level.id, { fractionPool: next });
                        }}
                      />
                      <Button
                        variant="ghost"
                        icon={<Trash color="#b3261e" />}
                        onClick={() => removePoolFraction(level.id, index)}
                      ></Button>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="secondary"
                  icon={<Plus />}
                  onClick={() => addPoolFraction(level.id)}
                  disabled={draft.fractionPool.length >= 5}
                  style ={{ marginTop: "1em" }}
                >
                  Adicionar fração
                  
                </Button>
              </div>
            )}

            {message && (
              <InlineFeedback kind={message.kind}>
                {message.text}
              </InlineFeedback>
            )}

            <Button
              onClick={() => handleSave(level)}
              disabled={savingId === level.id}
            >
              {savingId === level.id ? "Salvando…" : "Salvar"}
            </Button>
          </section>
        );
      })}
    </main>
  );
}

export default TeacherMiniGameSettings;
