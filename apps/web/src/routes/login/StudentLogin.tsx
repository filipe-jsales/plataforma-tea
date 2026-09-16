import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiClient } from "../../lib/apiClient";
import { completeLogin } from "../../lib/authFlow";
import { getIllustrationAsset } from "../../lib/illustrationAssets";
import "./StudentLogin.css";
import { Button } from "../../components/ui";

interface RosterEntry {
  userId: string;
  displayName: string;
  avatar: { label: string; assetRef: string } | null;
}

interface IllustrationOption {
  id: string;
  label: string;
  assetRef: string;
  position: number;
}

type Step = "code" | "avatar" | "sequence";

// 1.2.1 — fluxo aluno: código de turma → avatar (roster) → sequência de 3
// imagens em posição fixa. Sem digitação de usuário/senha (RQ4 motora fina
// + cognitiva). Mensagens de erro sempre descritivas e reversíveis, nunca
// "senha incorreta" cru — regra não-negociável 4.
export function StudentLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("code");
  const [joinCode, setJoinCode] = useState("");
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<RosterEntry | null>(
    null,
  );
  const [loginImages, setLoginImages] = useState<IllustrationOption[] | null>(
    null,
  );
  const [sequence, setSequence] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [screenOpenedAt] = useState(() => Date.now());

  // Catálogo de imagens de login é o mesmo pra qualquer aluno — busca uma
  // vez, layout fica pronto antes do aluno chegar no passo 3.
  useEffect(() => {
    apiClient
      .get<IllustrationOption[]>("/illustrations?kind=login_image")
      .then(setLoginImages);
  }, []);

  async function handleCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!joinCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const entries = await apiClient.get<RosterEntry[]>(
        `/auth/student/classrooms/${joinCode.trim().toUpperCase()}/roster`,
      );
      setRoster(entries);
      setStep("avatar");
    } catch {
      setError(
        "Não encontramos essa turma — confira o código com seu professor.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSelectStudent(entry: RosterEntry) {
    setSelectedStudent(entry);
    setSequence([]);
    setStep("sequence");
  }

  async function handleSelectImage(imageId: string) {
    if (sequence.length >= 3 || loading) return;
    const nextSequence = [...sequence, imageId];
    setSequence(nextSequence);

    if (nextSequence.length === 3 && selectedStudent) {
      setLoading(true);
      setError(null);
      try {
        await completeLogin(() =>
          apiClient.post("/auth/student/login", {
            userId: selectedStudent.userId,
            imageSequence: nextSequence,
            durationMs: Date.now() - screenOpenedAt,
            retryCount,
          }),
        );
        navigate("/", { replace: true });
      } catch (err) {
        setRetryCount((count) => count + 1);
        setSequence([]);
        setError(
          err instanceof ApiError && err.status === 401
            ? "Quase lá — essa sequência não bateu. Quer tentar de novo?"
            : "Não deu pra entrar agora. Quer tentar de novo?",
        );
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <main className="student-login">
      {step === "code" && (
        <form onSubmit={handleCodeSubmit}>
          <h1>Código da turma</h1>
          <p>Peça o código para seu professor(a).</p>
          <input
            className="student-login__code-input"
            type="text"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="AZUL-7"
            autoFocus
          />
          {error && <p className="student-login__error">{error}</p>}
          <button type="submit" disabled={loading || !joinCode.trim()}>
            {loading ? "Procurando…" : "Entrar na turma"}
          </button>
        </form>
      )}

      {step === "avatar" && (
        <div>
          <h1>Qual é você?</h1>
          <div className="student-login__grid">
            {roster?.map((entry) => (
              <button
                key={entry.userId}
                type="button"
                className="student-login__tile"
                onClick={() => handleSelectStudent(entry)}
              >
                {entry.avatar && (
                  <img
                    src={getIllustrationAsset(entry.avatar.assetRef)}
                    alt=""
                    className="student-login__tile-image"
                  />
                )}
                <span>{entry.displayName}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="student-login__link"
            onClick={() => {
              setStep("code");
              setRoster(null);
            }}
          >
            Trocar de turma
          </button>
        </div>
      )}

      {step === "sequence" && (
        <div>
          <h1>Toque suas 3 imagens, em ordem</h1>
          {error && <p className="student-login__error">{error}</p>}
          <div className="student-login__grid">
            {loginImages?.map((option) => {
              const order = sequence.indexOf(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className="student-login__tile"
                  onClick={() => handleSelectImage(option.id)}
                  disabled={loading || sequence.includes(option.id)}
                >
                  <img
                    src={getIllustrationAsset(option.assetRef)}
                    alt=""
                    className="student-login__tile-image"
                  />
                  <span>{option.label}</span>
                  {order >= 0 && (
                    <span className="student-login__order-badge">
                      {order + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="student-login_change">
            <Button variant="primary" onClick={() => setSequence([])}>
              Recomeçar
            </Button>
            <Button variant="primary" onClick={() => setSequence([])}>
              Trocar de aluno
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
